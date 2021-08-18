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
const StatusCodes =  require('http-status-codes').StatusCodes;

const request_with_header = {
  prefixUrl: 'http:/localhost:1026',
  throwHttpErrors: false,
  headers: { 'x-auth-token': '111111111' }
};

const request_with_header_and_body = {
  prefixUrl: 'http:/localhost:1026',
  throwHttpErrors: false,
  headers: { 'x-auth-token': '111111111' },
  body: 'HELLO'
};

const keyrock_deny_response = {
  app_id: 'application_id',
  trusted_apps: [],
  authorization_decision: 'Deny'
};

const keyrock_permit_response = {
  app_id: 'application_id',
  trusted_apps: [],
  authorization_decision: 'Permit'
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
    pdp: 'idm' // idm|iShare|xacml|authzforce|opa|azf
  }
};

describe('Authorization: Keyrock PDP', () => {
  let pep;
  let contextBrokerMock;
  let idmMock;

  beforeEach((done) => {
    nock.cleanAll();
    const app = require('../../app');
    pep = app.start_server('12345', config);
    cache.flush();
    done();
  });

  afterEach((done) => {
    pep.close(config.pep_port);
    done();
  });

  describe('When a restricted path is requested for a legitimate user', () => {
    beforeEach(() => {
      contextBrokerMock = nock('http://fiware.org:1026').get('/restricted').reply(StatusCodes.OK, {});
      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=111111111&app_id=application_id&action=GET&resource=/restricted')
        .reply(StatusCodes.OK, keyrock_permit_response);
    });
    it('should allow access', (done) => {
      got.get('restricted', request_with_header).then((response) => {
        contextBrokerMock.done();
        idmMock.done();
        should.equal(response.statusCode, StatusCodes.OK);
        done();
      });
    });
  });

  describe('When a restricted path is requested and the app-id is not found', () => {
    beforeEach(() => {
      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=111111111&app_id=application_id&action=GET&resource=/restricted')
        .reply(StatusCodes.OK, {
          app_id: '',
          trusted_apps: [],
          authorization_decision: 'Permit'
        });
    });
    it('should deny access', (done) => {
      got.get('restricted', request_with_header).then((response) => {
        idmMock.done();
        should.equal(response.statusCode, StatusCodes.UNAUTHORIZED);
        done();
      });
    });
  });

  describe('When a restricted path is requested for a forbidden user', () => {
    beforeEach(() => {
      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=111111111&app_id=application_id&action=GET&resource=/restricted')
        .reply(StatusCodes.OK, keyrock_deny_response);
    });
    it('should deny access', (done) => {
      got.get('restricted', request_with_header).then((response) => {
        idmMock.done();
        should.equal(response.statusCode, StatusCodes.UNAUTHORIZED);
        done();
      });
    });
  });

  describe('When the same action on a restricted path multiple times', () => {
    beforeEach(() => {
      contextBrokerMock = nock('http://fiware.org:1026').get('/restricted').times(2).reply(StatusCodes.OK, {});
      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=111111111&app_id=application_id&action=GET&resource=/restricted')
        .reply(StatusCodes.OK, keyrock_permit_response);
    });
    it('should access the user action from cache', (done) => {
      got
        .get('restricted', request_with_header)
        .then((firstResponse) => {
          should.equal(firstResponse.statusCode, StatusCodes.OK);
          return got.get('restricted', request_with_header);
        })
        .then((secondResponse) => {
          contextBrokerMock.done();
          idmMock.done();
          should.equal(secondResponse.statusCode, StatusCodes.OK);
          done();
        });
    });
  });

  describe('When the same user request two different actions on a restricted path', () => {
    beforeEach(() => {
      contextBrokerMock = nock('http://fiware.org:1026').get('/restricted').reply(StatusCodes.OK, {});
      contextBrokerMock.post('/restricted').reply(204);

      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=111111111&app_id=application_id&action=GET&resource=/restricted')
        .reply(StatusCodes.OK, keyrock_permit_response);
      idmMock
        .get('/user?access_token=111111111&app_id=application_id&action=POST&resource=/restricted')
        .reply(StatusCodes.OK, keyrock_permit_response);
    });
    it('should not access the user from cache', (done) => {
      got
        .get('restricted', request_with_header)
        .then((firstResponse) => {
          should.equal(firstResponse.statusCode, StatusCodes.OK);
          return got.post('restricted', request_with_header_and_body);
        })
        .then((secondResponse) => {
          contextBrokerMock.done();
          idmMock.done();
          should.equal(secondResponse.statusCode, 204);
          done();
        });
    });
  });
});
