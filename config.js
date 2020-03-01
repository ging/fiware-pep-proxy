const config = {};

function toBoolean(env, defaultValue) {
  return env !== undefined ? env.toLowerCase() === 'true' : defaultValue;
}

function to_array(env, default_value) {
  return env !== undefined ? env.split(',') : default_value;
}

// Used only if https is disabled
config.pep_port = process.env.PEP_PROXY_PORT || 80;

// Test for Iaacaas
config.check_token = true;
config.coap = {
  enabled: toBoolean(process.env.PEP_PROXY_COAP_ENABLED, false),
  port: process.env.PEP_PROXY_COAP_PORT || 5684,
};

config.coaps = {
  enabled: toBoolean(process.env.PEP_PROXY_COAPS_ENABLED, false),
  crt_file: 'certs/cert.crt',
  key_file: 'certs/cert.key',
  port: process.env.IDM_COAPS_PORT || 4434,
};

// Set this var to undefined if you don't want the server to listen on HTTPS
config.https = {
  enabled: toBoolean(process.env.PEP_PROXY_HTTPS_ENABLED, true),
  cert_file: 'certs/cert.crt',
  key_file: 'certs/cert.key',
  port: process.env.PEP_PROXY_HTTPS_PORT || 444,
};

config.idm = {
  host: process.env.PEP_PROXY_IDM_HOST || 'localhost',
  port: process.env.PEP_PROXY_IDM_PORT || 3000,
  port_https: process.env.PEP_PROXY_IDM_PORT_HTTPS || 443,
  ssl: toBoolean(process.env.PEP_PROXY_IDM_SSL_ENABLED, true),
};

config.app = {
  host: process.env.PEP_PROXY_APP_HOST || 'localhost',
  port: process.env.PEP_PROXY_APP_PORT || '1026',
  ssl: toBoolean(process.env.PEP_PROXY_APP_SSL_ENABLED, true), // Use true if the app server listens in https
};

config.organizations = {
  enabled: toBoolean(process.env.PEP_PROXY_ORG_ENABLED, false),
  header: process.env.PEP_PROXY_ORG_HEADER || 'fiware-service',
};

// Credentials obtained when registering PEP Proxy in app_id in Account Portal
config.pep = {
  app_id:
    process.env.PEP_PROXY_APP_ID || '3771a537-84d4-4985-8cc3-bd24703138c3',
  username:
    process.env.PEP_PROXY_USERNAME ||
    'pep_proxy_0e2ff2c9-7bf4-46cd-81dd-58c871a27796',
  password:
    process.env.PEP_PASSWORD ||
    'pep_proxy_d7ae2119-2793-400d-9806-4d5cb2e3c74e',
  token: {
    secret: process.env.PEP_TOKEN_SECRET || '', // Secret must be configured in order validate a jwt
  },
  trusted_apps: [],
};

// in seconds
config.cache_time = 3000000;

// if enabled PEP checks permissions in two ways:
//  - With IdM: only allow basic authorization
//  - With Authzforce: allow basic and advanced authorization.
//	  For advanced authorization, you can use custom policy checks by including programatic scripts
//    in policies folder. An script template is included there
//
//	This is only compatible with oauth2 tokens engine

config.authorization = {
  enabled: toBoolean(process.env.PEP_PROXY_AUTH_ENABLED, false),
  pdp: process.env.PEP_PROXY_PDP || 'idm', // idm|authzforce
  azf: {
    protocol: process.env.PEP_PROXY_AZF_PROTOCOL || 'http',
    host: process.env.PEP_PROXY_AZF_HOST || 'localhost',
    port: process.env.PEP_PROXY_AZF_PORT || 8080,
    custom_policy: process.env.PEP_PROXY_AZF_CUSTOM_POLICY || undefined, // use undefined to default policy checks (HTTP verb + path).
  },
};

// list of paths that will not check authentication/authorization
// example: ['/public/*', '/static/css/']
config.public_paths = to_array(process.env.PEP_PROXY_PUBLIC_PATHS, []);

config.magic_key = process.env.PEP_PROXY_MAGIC_KEY || undefined;

module.exports = config;
