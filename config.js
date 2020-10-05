const config = {};

// Used only if https is disabled
config.pep_port = 80;

// Set this var to undefined if you don't want the server to listen on HTTPS
config.https = {
  enabled: false,
  cert_file: 'cert/cert.crt',
  key_file: 'cert/key.key',
  port: 443,
};

config.idm = {
  host: 'localhost',
  port: 3005,
  ssl: false,
};

config.app = {
  host: 'www.fiware.org',
  port: '80',
  ssl: false, // Use true if the app server listens in https
};

config.organizations = {
  enabled: false,
  header: 'fiware-service',
};

// Credentials obtained when registering PEP Proxy in app_id in Account Portal
config.pep = {
  app_id: '95defe37-519a-4939-befc-37670b9d1411',
  username: 'pep_proxy_32a8aeac-63e0-46a0-bad0-46f24de1bb68',
  password: 'pep_proxy_e45c91f5-8b2d-4a5f-8558-b73bc772bcf7',
  token: {
    secret: '', // Secret must be configured in order validate a jwt
  },
  trusted_apps: [],
};

// in seconds
config.cache_time = 300;

// if enabled PEP checks permissions in two ways:
//  - With IdM: only allow basic authorization
//  - With Authzforce: allow basic and advanced authorization.
//	  For advanced authorization, you can use custom policy checks by including programatic scripts
//    in policies folder. An script template is included there
//
//	This is only compatible with oauth2 tokens engine

config.authorization = {
  enabled: false,
  pdp: 'idm', // idm|authzforce
  azf: {
    protocol: 'http',
    host: 'localhost',
    port: 8080,
    custom_policy: undefined, // use undefined to default policy checks (HTTP verb + path).
  },
};

// list of paths that will not check authentication/authorization
// example: ['/public/*', '/static/css/']
config.public_paths = [];

config.magic_key = undefined;
config.auth_for_nginx = false;

module.exports = config;
