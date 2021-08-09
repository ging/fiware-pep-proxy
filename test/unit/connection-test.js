/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of Keyrock
 *
 */

const config_service = require('../../lib/config_service');
const should = require('should');
const nock = require('nock');
const IDM = require('../../lib/pdp/idm');
const Authzforce = require('../../lib/pdp/azf');
const cache = require('../../lib/cache');

const config = {
  pep_port: 80,
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
    pdp: 'idm', // idm|iShare|xacml|authzforce
    header: undefined, // NGSILD-Tenant|fiware-service
    azf: {
      protocol: 'http',
      host: 'authzforce.com',
      port: 8080,
      custom_policy: undefined // use undefined to default policy checks (HTTP verb + path).
    }
  }
};

describe('Connection Tests', function () {
  let idmMock;
  let authzforceMock;

  beforeEach(function (done) {
    config_service.set_config(config, true);
    cache.flush();
    done();
  });

  afterEach(function (done) {
    done();
  });

  describe('When connecting to Authzforce and it is present', function () {
    beforeEach(function () {
      // Set Up
      authzforceMock = nock('http://authzforce.com:8080').get('/').reply(200, {});
    });
    it('should not error', function (done) {
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

  describe('When connecting to Keyrock and it is present', function () {
    beforeEach(function () {
      // Set Up
      idmMock = nock('http://keyrock.com:3000').get('/version').reply(200, {});
    });
    it('should not error', function (done) {
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

  describe('When authenticating the PEP with Keyrock', function () {
    beforeEach(function () {
      // Set Up
      idmMock = nock('http://keyrock.com:3000').post('/v3/auth/tokens').reply(200, {});
    });
    it('should not error', function (done) {
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

  describe('When authenticating a misconfigured PEP with Keyrock', function () {
    beforeEach(function () {
      // Set Up
      idmMock = nock('http://keyrock.com:3000').post('/v3/auth/tokens').reply(401);
    });
    it('should error', function (done) {
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
