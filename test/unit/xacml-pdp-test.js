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
const StatusCodes = require('http-status-codes').StatusCodes;

const ngsiPayload = [
  {
    id: 'urn:ngsi-ld:TemperatureSensor:002',
    type: 'TemperatureSensor',
    category: {
      type: 'Property',
      value: 'sensor'
    },
    temperature: {
      type: 'Property',
      value: 21,
      unitCode: 'CEL'
    }
  },
  {
    id: 'urn:ngsi-ld:TemperatureSensor:003',
    type: 'TemperatureSensor',
    category: {
      type: 'Property',
      value: 'sensor'
    },
    temperature: {
      type: 'Property',
      value: 27,
      unitCode: 'CEL'
    }
  }
];
const keyrock_user_response = {
  app_id: 'application_id',
  trusted_apps: [],
  roles: [
    {
      id: 'managers-role-0000-0000-000000000000',
      name: 'Management'
    }
  ]
};

const request_with_headers = {
  prefixUrl: 'http:/localhost:1026',
  throwHttpErrors: false,
  headers: { 'x-auth-token': '111111111', 'fiware-service': 'smart-gondor', 'x-forwarded-for': 'example.com' }
};
const request_with_headers_and_body = {
  prefixUrl: 'http:/localhost:1026',
  throwHttpErrors: false,
  headers: { 'x-auth-token': '111111111', 'fiware-service': 'smart-gondor' },
  json: ngsiPayload
};

const xacml_permit_response = {
  Response: [
    {
      Decision: 'Permit',
      Status: {
        StatusCode: {
          Value: 'urn:oasis:names:tc:xacml:1.0:status:ok',
          StatusCode: { Value: 'urn:oasis:names:tc:xacml:1.0:status:ok' }
        }
      }
    }
  ]
};

const xacml_deny_response = {
  Response: [
    {
      Decision: 'Deny',
      Status: {
        StatusCode: {
          Value: 'urn:oasis:names:tc:xacml:1.0:status:ok',
          StatusCode: { Value: 'urn:oasis:names:tc:xacml:1.0:status:ok' }
        }
      }
    }
  ]
};

const config = {
  pep_port: 1026,
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
    pdp: 'xacml', // idm|iShare|xacml|authzforce|opa|azf
    header: 'fiware-service',
    xacml: {
      protocol: 'http',
      host: 'xacml.com',
      port: 8080,
      path: '/xacml'
    }
  }
};

describe('Authorization: XACML PDP', () => {
  let pep;
  let contextBrokerMock;
  let idmMock;
  let xacmlMock;

  beforeEach((done) => {
    const app = require('../../app');
    pep = app.start_server('12345', config);
    cache.flush();
    nock.cleanAll();
    idmMock = nock('http://keyrock.com:3000')
      .get('/user?access_token=111111111&app_id=application_id')
      .reply(StatusCodes.OK, keyrock_user_response);
    done();
  });

  afterEach((done) => {
    pep.close(config.pep_port);
    done();
  });

  describe('When a restricted URL is requested by a legitimate user', () => {
    beforeEach(() => {
      contextBrokerMock = nock('http://fiware.org:1026')
        .get('/path/entities/urn:ngsi-ld:entity:1111')
        .reply(StatusCodes.OK, {});
      xacmlMock = nock('http://xacml.com:8080').post('/xacml').reply(StatusCodes.OK, xacml_permit_response);
    });

    it('should allow access', (done) => {
      got.get('path/entities/urn:ngsi-ld:entity:1111', request_with_headers).then((response) => {
        contextBrokerMock.done();
        idmMock.done();
        xacmlMock.done();
        should.equal(response.statusCode, StatusCodes.OK);
        done();
      });
    });
  });

  describe('When a restricted URL is requested by a forbidden user', () => {
    beforeEach(() => {
      xacmlMock = nock('http://xacml.com:8080').post('/xacml').reply(StatusCodes.OK, xacml_deny_response);
    });

    it('should deny access', (done) => {
      got.get('path/entities/urn:ngsi-ld:entity:1111', request_with_headers).then((response) => {
        idmMock.done();
        xacmlMock.done();
        should.equal(response.statusCode, StatusCodes.UNAUTHORIZED);
        done();
      });
    });
  });

  describe('When a restricted URL with a query string is requested', () => {
    beforeEach(() => {
      contextBrokerMock = nock('http://fiware.org:1026')
        .get('/path/entities/?ids=urn:ngsi-ld:entity:1111&type=entity')
        .reply(StatusCodes.OK, {});
      xacmlMock = nock('http://xacml.com:8080').post('/xacml').reply(StatusCodes.OK, xacml_permit_response);
    });

    it('should allow access based on entities', (done) => {
      got.get('path/entities/?ids=urn:ngsi-ld:entity:1111&type=entity', request_with_headers).then((response) => {
        contextBrokerMock.done();
        idmMock.done();
        xacmlMock.done();
        should.equal(response.statusCode, StatusCodes.OK);
        done();
      });
    });
  });

  describe('When a restricted URL with a payload body is requested', () => {
    beforeEach(() => {
      xacmlMock = nock('http://xacml.com:8080').post('/xacml').reply(StatusCodes.OK, xacml_permit_response);
      contextBrokerMock = nock('http://fiware.org:1026')
        .patch('/path/entityOperations/upsert')
        .reply(StatusCodes.OK, {});
    });

    it('should allow access based on entities', (done) => {
      got.patch('path/entityOperations/upsert', request_with_headers_and_body).then((response) => {
        contextBrokerMock.done();
        idmMock.done();
        xacmlMock.done();
        should.equal(response.statusCode, StatusCodes.OK);
        done();
      });
    });
  });
});
