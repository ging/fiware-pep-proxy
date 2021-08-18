/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const config_service = require('../../lib/config_service');
const should = require('should');
const nock = require('nock');
const IDM = require('../../lib/pdp/keyrock');
const Authzforce = require('../../lib/pdp/authzforce');
const cache = require('../../lib/cache');
const StatusCodes = require('http-status-codes').StatusCodes;

const config = {
  pep_port: 1026,
  pep: {
    app_id: 'application_id',
    trusted_apps: [],
    username: 'user',
    password: 'password'
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
    pdp: 'azf',
    azf: {
      protocol: 'http',
      host: 'authzforce.com',
      port: 8080,
      custom_policy: undefined // use undefined to default policy checks (HTTP verb + path).
    }
  }
};

describe('Connection Tests', () => {
  let idmMock;
  let authzforceMock;

  beforeEach((done) => {
    config_service.set_config(config, true);
    cache.flush();
    nock.cleanAll();
    done();
  });

  afterEach((done) => {
    done();
  });

  describe('When connecting to Authzforce and it is present', () => {
    beforeEach(() => {
      authzforceMock = nock('http://authzforce.com:8080').get('/').reply(StatusCodes.OK, {});
    });
    it('should not error', (done) => {
      Authzforce.checkConnectivity()
        .then(() => {
          authzforceMock.done();
          done();
        })
        .catch((err) => {
          should.fail("error was thrown when it shouldn't have been", err);
        });
    });
  });

  describe('When connecting to Keyrock and it is present', () => {
    beforeEach(() => {
      idmMock = nock('http://keyrock.com:3000').get('/version').reply(StatusCodes.OK, {});
    });
    it('should not error', (done) => {
      IDM.checkConnectivity()
        .then(() => {
          idmMock.done();
          done();
        })
        .catch((err) => {
          should.fail("error was thrown when it shouldn't have been", err);
        });
    });
  });

  describe('When authenticating the PEP with Keyrock', () => {
    beforeEach(() => {
      idmMock = nock('http://keyrock.com:3000').post('/v3/auth/tokens').reply(StatusCodes.OK, {});
    });
    it('should not error', (done) => {
      IDM.authenticatePEP()
        .then(() => {
          idmMock.done();
          done();
        })
        .catch((err) => {
          should.fail("error was thrown when it shouldn't have been", err);
        });
    });
  });

  describe('When authenticating a misconfigured PEP with Keyrock', () => {
    beforeEach(() => {
      idmMock = nock('http://keyrock.com:3000').post('/v3/auth/tokens').reply(StatusCodes.UNAUTHORIZED);
    });
    it('should error', (done) => {
      IDM.authenticatePEP()
        .then(() => {
          should.fail('no error was thrown when it should have been');
        })
        .catch(() => {
          idmMock.done();
          done();
        });
    });
  });
});
