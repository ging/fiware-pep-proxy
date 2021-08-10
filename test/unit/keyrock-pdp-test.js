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

const request_with_header_and_body = {
  prefixUrl: 'http:/localhost:80',
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
    pdp: 'idm' // idm|iShare|xacml|authzforce
  }
};

describe('Authorization: Keyrock PDP', function () {
  let pep;
  let contextBrokerMock;
  let idmMock;

  beforeEach(function (done) {
    const app = require('../../app');
    pep = app.start_server('12345', config);
    cache.flush();
    done();
  });

  afterEach(function (done) {
    pep.close(config.pep_port);
    done();
  });

  describe('When a restricted path is requested for a legitimate user', function () {
    beforeEach(function () {
      // Set Up
      nock.cleanAll();
      contextBrokerMock = nock('http://fiware.org:1026').get('/restricted').reply(200, {});
      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=111111111&app_id=application_id&action=GET&resource=/restricted')
        .reply(200, keyrock_permit_response);
    });
    it('should allow access', function (done) {
      got.get('restricted', request_with_header).then((response) => {
        contextBrokerMock.done();
        idmMock.done();
        should.equal(response.statusCode, 200);
        done();
      });
    });
  });

  describe('When a restricted path is requested and the app-id is not found', function () {
    beforeEach(function () {
      // Set Up
      nock.cleanAll();
      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=111111111&app_id=application_id&action=GET&resource=/restricted')
        .reply(200, {
          app_id: '',
          trusted_apps: [],
          authorization_decision: 'Permit'
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

  describe('When a restricted path is requested for a forbidden user', function () {
    beforeEach(function () {
      // Set Up
      nock.cleanAll();
      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=111111111&app_id=application_id&action=GET&resource=/restricted')
        .reply(200, keyrock_deny_response);
    });
    it('should deny access', function (done) {
      got.get('restricted', request_with_header).then((response) => {
        idmMock.done();
        should.equal(response.statusCode, 401);
        done();
      });
    });
  });

  describe('When the same action on a restricted path multiple times', function () {
    beforeEach(function () {
      // Set Up
      nock.cleanAll();
      contextBrokerMock = nock('http://fiware.org:1026').get('/restricted').times(2).reply(200, {});
      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=111111111&app_id=application_id&action=GET&resource=/restricted')
        .reply(200, keyrock_permit_response);
    });
    it('should access the user action from cache', function (done) {
      got
        .get('restricted', request_with_header)
        .then((firstResponse) => {
          should.equal(firstResponse.statusCode, 200);
          return got.get('restricted', request_with_header);
        })
        .then((secondResponse) => {
          contextBrokerMock.done();
          idmMock.done();
          should.equal(secondResponse.statusCode, 200);
          done();
        });
    });
  });

  describe('When the same user request two different actions on a restricted path', function () {
    beforeEach(function () {
      // Set Up
      nock.cleanAll();
      contextBrokerMock = nock('http://fiware.org:1026').get('/restricted').reply(200, {});

      contextBrokerMock.post('/restricted').reply(204);

      idmMock = nock('http://keyrock.com:3000')
        .get('/user?access_token=111111111&app_id=application_id&action=GET&resource=/restricted')
        .reply(200, keyrock_permit_response);
      idmMock
        .get('/user?access_token=111111111&app_id=application_id&action=POST&resource=/restricted')
        .reply(200, keyrock_permit_response);
    });
    it('should not access the user from cache', function (done) {
      got
        .get('restricted', request_with_header)
        .then((firstResponse) => {
          should.equal(firstResponse.statusCode, 200);
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
