const config = {};

function toBoolean(env, defaultValue) {
  return env !== undefined ? env.toLowerCase() === 'true' : defaultValue;
}

// Used only if https is disabled
config.pep_port = process.env.PEP_PROXY_PORT || 80;

// Set this var to undefined if you don't want the server to listen on HTTPS
config.https = {
  enabled: toBoolean(process.env.PEP_PROXY_HTTPS_ENABLED, false),
  cert_file: 'cert/cert.crt',
  key_file: 'cert/key.key',
  port: process.env.PEP_PROXY_HTTPS_PORT || 443,
};

config.idm = {
  host: process.env.PEP_PROXY_IDM_HOST || 'localhost',
  port: process.env.PEP_PROXY_IDM_PORT || 4000,
  ssl: toBoolean(process.env.PEP_PROXY_IDM_SSL_ENABLED, false),
};

config.app = {
  host: process.env.PEP_PROXY_APP_HOST || 'www.fiware.org',
  port: process.env.PEP_PROXY_APP_PORT || '80',
  ssl: toBoolean(process.env.PEP_PROXY_APP_SSL_ENABLED, false), // Use true if the app server listens in https
};

config.organizations = {
  enabled: true,
};

// Credentials obtained when registering PEP Proxy in app_id in Account Portal
config.pep = {
  app_id:
    process.env.PEP_PROXY_APP_ID || '491b27ed-2f1e-4435-8a6c-01c25220af12', //'90d6f527-fcee-4a6b-8db6-8c53d04d85f4',
  username:
    process.env.PEP_PROXY_USERNAME ||
    'pep_proxy_9b0b48d1-bf44-40ca-85ee-3ea12fd5a207',
  //'pep_proxy_aebaf1a7-5c92-48df-8996-dc22f876603d',
  password:
    process.env.PEP_PASSWORD ||
    'pep_proxy_5408c16d-e28b-49b4-926a-717ecec42a10',
  //'pep_proxy_9a02a907-1947-4391-9d41-334bb06922e8',
  token: {
    secret: process.env.PEP_TOKEN_SECRET || '', // Secret must be configured in order validate a jwt
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
config.public_paths = [];

config.magic_key = process.env.PEP_PROXY_MAGIC_KEY || undefined;

module.exports = config;
