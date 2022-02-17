/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of Keyrock
 *
 */

const got = require('got');
const should = require('should');
const nock = require('nock');
const cache = require('../../lib/cache');
const StatusCodes = require('http-status-codes').StatusCodes;
const utils = require('./utils');

const shortToken = '111111111';
const longToken = '11111111111111111111111111111111111111111111111111111111111111';

const no_token = {
  prefixUrl: 'http:/localhost:1026',
  throwHttpErrors: false
};

const auth_token = {
  prefixUrl: 'http:/localhost:1026',
  throwHttpErrors: false,
  headers: { 'x-auth-token': shortToken }
};

const bearer_token = {
  prefixUrl: 'http:/localhost:1026',
  throwHttpErrors: false,
  headers: { authorization: 'Bearer: ' + Buffer.from(shortToken, 'utf-8').toString('base64') }
};

const bearer_token_long = {
  prefixUrl: 'http:/localhost:1026',
  throwHttpErrors: false,
  headers: { authorization: 'Bearer: ' + Buffer.from(longToken, 'utf-8').toString('base64') }
};

const magic_key = {
  prefixUrl: 'http:/localhost:1026',
  throwHttpErrors: false,
  headers: { 'x-auth-token': '999999999' }
};

const config = {
  magic_key: '999999999',
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
  cache_time: 1,
  public_paths: ['/public'],
  authorization: {
    enabled: false,
    pdp: 'idm', // idm|iShare|xacml|authzforce|opa|azf
    header: undefined, // NGSILD-Tenant|fiware-service
    azf: {
      protocol: 'http',
      host: 'localhost',
      port: 8080,
      custom_policy: undefined // use undefined to default policy checks (HTTP verb + path).
    }
  }
};

const keyrock_user_response = {
  app_id: 'application_id',
  trusted_apps: [],
  id: 'username',
  displayName: 'Some User'
};

describe('Authentication: Keyrock IDM', () => {
  let pep;
  let contextBrokerMock;
  let idmMock;

  beforeEach((done) => {
    const app = require('../../app');
    pep = app.start_server('12345', config);
    cache.flush();
    nock.cleanAll();
    done();
  });

  afterEach((done) => {
    pep.close(config.pep_port);
    done();
  });

  describe('When a URL is requested and no token is present', () => {
    beforeEach(() => {
      // Set Up
    });
    it('should deny access', (done) => {
      got.get('restricted_path', no_token).then((response) => {
        should.equal(response.statusCode, StatusCodes.UNAUTHORIZED);
        done();
      });
    });
  });

  describe('When a public path is requested', () => {
    beforeEach(() => {
      contextBrokerMock = nock('http://fiware.org:1026').get('/public').reply(StatusCodes.OK, {});
    });
    it('should allow access', (done) => {
      got.get('public', no_token).then((response) => {
        contextBrokerMock.done();
        should.equal(response.statusCode, StatusCodes.OK);
        done();
      });
    });
  });

  describe('When a restricted path is requested and the token matches the magic key', () => {
    beforeEach(() => {
      contextBrokerMock = nock('http://fiware.org:1026').get('/restricted').reply(StatusCodes.OK, {});
    });
    it('should allow access', (done) => {
      got.get('restricted', magic_key).then((response) => {
        contextBrokerMock.done();
        should.equal(response.statusCode, StatusCodes.OK);
        done();
      });
    });
  });

  describe('When a restricted path is requested for a legitimate user with an x-auth-token', () => {
    beforeEach(() => {
      contextBrokerMock = nock('http://fiware.org:1026').get('/restricted').reply(StatusCodes.OK, {});
      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=' + shortToken + '&app_id=application_id')
        .reply(StatusCodes.OK, keyrock_user_response);
    });
    it('should authenticate the user and allow access', (done) => {
      got.get('restricted', auth_token).then((response) => {
        contextBrokerMock.done();
        idmMock.done();
        should.equal(response.statusCode, StatusCodes.OK);
        done();
      });
    });
  });

  describe('When a restricted path is requested for a legitimate user with a bearer token', () => {
    beforeEach(() => {
      contextBrokerMock = nock('http://fiware.org:1026').get('/restricted').reply(StatusCodes.OK, {});
      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=' + shortToken + '&app_id=application_id')
        .reply(StatusCodes.OK, keyrock_user_response);
    });
    it('should authenticate the user and allow access', (done) => {
      got.get('restricted', bearer_token).then((response) => {
        contextBrokerMock.done();
        idmMock.done();
        should.equal(response.statusCode, StatusCodes.OK);
        done();
      });
    });
  });

  describe('When a restricted path is requested for a forbidden user', () => {
    beforeEach(() => {
      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=' + shortToken + '&app_id=application_id')
        .reply(StatusCodes.UNAUTHORIZED);
    });
    it('should authenticate the user and deny access', (done) => {
      got.get('restricted', auth_token).then((response) => {
        contextBrokerMock.done();
        idmMock.done();
        should.equal(response.statusCode, StatusCodes.UNAUTHORIZED);
        done();
      });
    });
  });

  describe('When a non-existant restricted path is requested', () => {
    beforeEach(() => {
      contextBrokerMock = nock('http://fiware.org:1026').get('/restricted').reply(404);
      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=' + shortToken + '&app_id=application_id')
        .reply(StatusCodes.OK, keyrock_user_response);
    });
    it('should authenticate the user and proxy the error', (done) => {
      got.get('restricted', auth_token).then((response) => {
        contextBrokerMock.done();
        idmMock.done();
        should.equal(response.statusCode, 404);
        done();
      });
    });
  });

  describe('When the same restricted path is requested multiple times', () => {
    beforeEach(() => {
      contextBrokerMock = nock('http://fiware.org:1026').get('/restricted').times(2).reply(StatusCodes.OK, {});
      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=' + shortToken + '&app_id=application_id')
        .reply(StatusCodes.OK, keyrock_user_response);
    });
    it('should access the user from cache', (done) => {
      got
        .get('restricted', auth_token)
        .then((firstResponse) => {
          should.equal(firstResponse.statusCode, StatusCodes.OK);
          return got.get('restricted', auth_token);
        })
        .then((secondResponse) => {
          contextBrokerMock.done();
          idmMock.done();
          should.equal(secondResponse.statusCode, StatusCodes.OK);
          done();
        });
    });
  });

  describe('When the same restricted path is requested multiple times with a bearer token', () => {
    beforeEach(() => {
      contextBrokerMock = nock('http://fiware.org:1026').get('/restricted').times(3).reply(StatusCodes.OK, {});
      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=' + longToken + '&app_id=application_id')
        .times(2)
        .reply(StatusCodes.OK, keyrock_user_response);
    });
    it('should access the user from cache', (done) => {
      got
        .get('restricted', bearer_token_long)
        .then((firstResponse) => {
          should.equal(firstResponse.statusCode, StatusCodes.OK);
          return got.get('restricted', bearer_token_long);
        })
        .then(async function (secondResponse) {
          should.equal(secondResponse.statusCode, StatusCodes.OK);
          await utils.sleep(2000);
          return got.get('restricted', bearer_token_long);
        })
        .then((thirdResponse) => {
          contextBrokerMock.done();
          idmMock.done();
          should.equal(thirdResponse.statusCode, StatusCodes.OK);
          done();
        });
    });
  });
});
