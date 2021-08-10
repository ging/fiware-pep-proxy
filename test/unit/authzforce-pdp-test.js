/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const got = require('got');
const should = require('should');
const nock = require('nock');
const cache = require('../../lib/cache');

const request_with_header = {
  prefixUrl: 'http:/localhost:80',
  throwHttpErrors: false,
  headers: { 'x-auth-token': '111111111' }
};

const keyrock_user_with_azf = {
  app_id: 'application_id',
  trusted_apps: [],
  app_azf_domain: 'authzforce',
  roles: [
    {
      id: 'managers-role-0000-0000-000000000000',
      name: 'Management'
    }
  ],
  organizations: [
    {
      roles: [
        {
          id: 'my-organization-0000-0000-000000000000',
          name: 'Organization'
        }
      ]
    }
  ]
};

const authzforce_permit_response = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ns3:Response xmlns="http://authzforce.github.io/rest-api-model/xmlns/authz/5"
  xmlns:ns2="http://www.w3.org/2005/Atom"
  xmlns:ns3="urn:oasis:names:tc:xacml:3.0:core:schema:wd-17"
  xmlns:ns4="http://authzforce.github.io/core/xmlns/pdp/6.0"
  xmlns:ns5="http://authzforce.github.io/pap-dao-flat-file/xmlns/properties/3.6">
    <ns3:Result>
        <ns3:Decision>Permit</ns3:Decision>
    </ns3:Result>
</ns3:Response>`;

const authzforce_deny_response = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ns3:Response xmlns="http://authzforce.github.io/rest-api-model/xmlns/authz/5"
  xmlns:ns2="http://www.w3.org/2005/Atom"
  xmlns:ns3="urn:oasis:names:tc:xacml:3.0:core:schema:wd-17"
  xmlns:ns4="http://authzforce.github.io/core/xmlns/pdp/6.0"
  xmlns:ns5="http://authzforce.github.io/pap-dao-flat-file/xmlns/properties/3.6">
    <ns3:Result>
        <ns3:Decision>Deny</ns3:Decision>
    </ns3:Result>
</ns3:Response>`;

const config = {
  pep_port: 80,
  pep: {
    app_id: 'application_id',
    trusted_apps: []
  },
  idm: {
    host: 'keyrock.com',
    port: '3000',
    ssl: false
  },
  app: {
    host: 'fiware.org',
    port: '1026',
    ssl: false // Use true if the app server listens in https
  },
  organizations: {
    enabled: false
  },
  cache_time: 300,
  public_paths: [],
  authorization: {
    enabled: true,
    pdp: 'authzforce', // idm|iShare|xacml|authzforce|opa|azf
    header: undefined, // NGSILD-Tenant|fiware-service
    azf: {
      protocol: 'http',
      host: 'authzforce.com',
      port: 8080,
      custom_policy: undefined // use undefined to default policy checks (HTTP verb + path).
    }
  }
};

describe('Authorization: Authzforce PDP', function () {
  let pep;
  let contextBrokerMock;
  let idmMock;
  let authzforceMock;

  beforeEach(function (done) {
    const app = require('../../app');
    pep = app.start_server('12345', config);
    cache.flush();
    nock.cleanAll();
    idmMock = nock('http://keyrock.com:3000')
      .get('/user?access_token=111111111&app_id=application_id&authzforce=true')
      .reply(200, keyrock_user_with_azf);
    done();
  });

  afterEach(function (done) {
    pep.close(config.pep_port);
    done();
  });

  describe('When a restricted path is requested for a legitimate user', function () {
    beforeEach(function () {
      contextBrokerMock = nock('http://fiware.org:1026').get('/restricted').reply(200, {});
      authzforceMock = nock('http://authzforce.com:8080')
        .post('/authzforce-ce/domains/authzforce/pdp')
        .reply(200, authzforce_permit_response);
    });

    it('should allow access', function (done) {
      got.get('restricted', request_with_header).then((response) => {
        contextBrokerMock.done();
        idmMock.done();
        authzforceMock.done();
        should.equal(response.statusCode, 200);
        done();
      });
    });
  });

  describe('When a restricted path is requested for a forbidden user', function () {
    beforeEach(function () {
      authzforceMock = nock('http://authzforce.com:8080')
        .post('/authzforce-ce/domains/authzforce/pdp')
        .reply(200, authzforce_deny_response);
    });

    it('should deny access when denied', function (done) {
      got.get('restricted', request_with_header).then((response) => {
        idmMock.done();
        authzforceMock.done();
        should.equal(response.statusCode, 401);
        done();
      });
    });
  });

  describe('When no AZF domain is returned', function () {
    beforeEach(function () {
      nock.cleanAll();
      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=111111111&app_id=application_id&authzforce=true')
        .reply(200, {
          app_id: 'application_id',
          trusted_apps: []
        });
    });
    it('should deny access', function (done) {
      got.get('restricted', request_with_header).then((response) => {
        idmMock.done();
        should.equal(response.statusCode, 401);
        done();
      });
    });
  });
});
