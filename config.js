#!/usr/bin/env node
const config = {};

// Used only if https is disabled
config.pep_port = 3001;

// Set this var to undefined if you don't want the server to listen on HTTPS
config.https = {
  enabled: false,
  cert_file: 'cert/cert.crt',
  key_file: 'cert/key.key',
  port: 443
};

config.idm = {
  host: 'localhost',
  port: 3000,
  ssl: false
};

config.app = {
  host: 'localhost',
  port: '3002',
  ssl: false // Use true if the app server listens in https
};

config.organizations = {
  enabled: false,
  header: 'fiware-service'
};

// Credentials obtained when registering PEP Proxy in app_id in Account Portal
config.pep = {
  app_id: 'c365f878-a348-4584-8ac4-7e940697e1b6',
  username: 'pep_proxy_7f270eda-17ed-4a49-b9fc-2f6f68490782',
  password: 'pep_proxy_6a079689-6d4d-466c-bfd9-d2a0af4c6196',
  token: {
    secret: '' // Secret must be configured in order validate a jwt
  },
  trusted_apps: []
};

// in seconds
config.cache_time = 300;

// if enabled PEP checks permissions in two ways:
//  - With IdM: only allow basic authorization
//  - With Authzforce: allow basic and advanced authorization.
//    For advanced authorization, you can use custom policy checks by including programatic scripts
//    in policies folder. An script template is included there
//
//  This is only compatible with oauth2 tokens engine

config.authorization = {
  enabled: false,
  type: 'idm', // idm|iShare|xacml|authzforce
  header: undefined, // NGSILD-Tenant|fiware-service
  pdp: {
    protocol: 'http',
    host: 'localhost',
    port: 8080,
    path: ''
  },
  azf: {
    custom_policy: undefined // use undefined to default policy checks (HTTP verb + path).
  }
};

config.cors = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  credentials: true
};

config.cluster = {
  type: 'manual', // manual|allCPUCores
  number: 1
};

// list of paths that will not check authentication/authorization
// example: ['/public/*', '/static/css/']
config.public_paths = [];

config.magic_key = undefined;
config.auth_for_nginx = false;

config.error_template = `{
    "type": "{{type}}",
    "title": "{{title}}",
    "detail": "{{message}}"
  }`;
config.error_content_type = 'application/json';

module.exports = config;
