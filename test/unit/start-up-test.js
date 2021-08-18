const config_service = require('../../lib/config_service');
const should = require('should');

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
    enabled: false,
    pdp: 'authzforce' // idm|iShare|xacml|authzforce|opa|azf
  }
};

describe('When the PEP Proxy is started with environment variables', () => {
  beforeEach(() => {
    process.env.PEP_PROXY_PORT = 8080;
    process.env.PEP_PROXY_HTTPS_ENABLED = 'true';
    process.env.PEP_PROXY_HTTPS_PORT = 443;
    process.env.PEP_PROXY_IDM_HOST = 'idm_host';
    process.env.PEP_PROXY_IDM_PORT = 3000;
    process.env.PEP_PROXY_IDM_SSL_ENABLED = 'true';
    process.env.PEP_PROXY_APP_HOST = 'app_host';
    process.env.PEP_PROXY_APP_PORT = '1026';
    process.env.PEP_PROXY_APP_SSL_ENABLED = 'true';
    process.env.PEP_PROXY_ORG_ENABLED = 'true';
    process.env.PEP_PROXY_ORG_HEADER = 'organization';
    process.env.PEP_PROXY_APP_ID = '9999999111';
    process.env.PEP_PROXY_USERNAME = 'user';
    process.env.PEP_PASSWORD = 'password';
    process.env.PEP_TOKEN_SECRET = 'secret-token';
    process.env.PEP_TRUSTED_APPS = '';

    process.env.PEP_PROXY_PUBLIC_PATHS = 'a,b,c';
    process.env.PEP_PROXY_AUTH_FOR_NGINX = 'false';
    process.env.PEP_PROXY_MAGIC_KEY = '54321';
    process.env.PEP_PROXY_DEBUG = 'PEP-Proxy:*';
    process.env.PEP_PROXY_ERROR_TEMPLATE = '{{message}}';
    process.env.PEP_PROXY_ERROR_CONTENT_TYPE = 'text/html';
  });

  afterEach(() => {
    delete process.env.IOTA_CB_HOST;
    delete process.env.PEP_PROXY_PORT;
    delete process.env.PEP_PROXY_HTTPS_ENABLED;
    delete process.env.PEP_PROXY_HTTPS_PORT;
    delete process.env.PEP_PROXY_IDM_HOST;
    delete process.env.PEP_PROXY_IDM_PORT;
    delete process.env.PEP_PROXY_IDM_SSL_ENABLED;
    delete process.env.PEP_PROXY_APP_HOST;
    delete process.env.PEP_PROXY_APP_PORT;
    delete process.env.PEP_PROXY_APP_SSL_ENABLED;
    delete process.env.PEP_PROXY_ORG_ENABLED;
    delete process.env.PEP_PROXY_ORG_HEADER;
    delete process.env.PEP_PROXY_APP_ID;
    delete process.env.PEP_PROXY_USERNAME;
    delete process.env.PEP_PASSWORD;
    delete process.env.PEP_TOKEN_SECRET;
    delete process.env.PEP_TRUSTED_APPS;

    delete process.env.PEP_PROXY_PUBLIC_PATHS;
    delete process.env.PEP_PROXY_AUTH_FOR_NGINX;
    delete process.env.PEP_PROXY_MAGIC_KEY;
    delete process.env.PEP_PROXY_DEBUG;
    delete process.env.PEP_PROXY_ERROR_TEMPLATE;
    delete process.env.PEP_PROXY_ERROR_CONTENT_TYPE;
  });

  it('should amend the configuration', (done) => {
    config_service.set_config(config, true);
    const pep_config = config_service.get_config();

    should.equal(pep_config.pep_port, '8080');
    should.equal(pep_config.pep.app_id, '9999999111');
    should.equal(pep_config.pep.username, 'user');
    should.equal(pep_config.pep.password, 'password');
    should.equal(pep_config.pep.token.secret, 'secret-token');

    should.equal(pep_config.idm.host, 'idm_host');
    should.equal(pep_config.idm.port, '3000');
    should.equal(pep_config.idm.ssl, true);

    should.equal(pep_config.app.host, 'app_host');
    should.equal(pep_config.app.port, '1026');
    should.equal(pep_config.app.ssl, true);

    should.equal(pep_config.organizations.enabled, true);
    should.equal(pep_config.organizations.header, 'organization');
    done();
  });
});

describe('When any PDP is configured with environment variables', () => {
  beforeEach(() => {
    process.env.PEP_PROXY_AUTH_ENABLED = 'true';
    process.env.PEP_PROXY_PDP = 'opa';
    process.env.PEP_PROXY_PDP_PROTOCOL = 'https';
    process.env.PEP_PROXY_PDP_HOST = 'pdp-host';
    process.env.PEP_PROXY_PDP_PORT = 443;
  });

  afterEach(() => {
    delete process.env.PEP_PROXY_PDP;
    delete process.env.PEP_PROXY_PDP_PROTOCOL;
    delete process.env.PEP_PROXY_PDP_HOST;
    delete process.env.PEP_PROXY_PDP_PORT;
  });

  it('should amend the PDP configuration', (done) => {
    config_service.set_config(config, true);
    const authorization = config_service.get_config().authorization;
    const pdp = config_service.get_config().authorization.opa;

    should.equal(authorization.enabled, true);
    should.equal(authorization.pdp, 'opa');
    should.equal(pdp.protocol, 'https');
    should.equal(pdp.host, 'pdp-host');
    should.equal(pdp.port, '443');
    done();
  });
});

describe('When the Authzforce PDP is started with environment variables', () => {
  beforeEach(() => {
    process.env.PEP_PROXY_AZF_PROTOCOL = 'http';
    process.env.PEP_PROXY_AZF_HOST = 'authzforce.com';
    process.env.PEP_PROXY_AZF_PORT = 9090;
    process.env.PEP_PROXY_AZF_CUSTOM_POLICY = 'policy';
  });

  afterEach(() => {
    delete process.env.PEP_PROXY_AZF_PROTOCOL;
    delete process.env.PEP_PROXY_AZF_HOST;
    delete process.env.PEP_PROXY_AZF_PORT;
    delete process.env.PEP_PROXY_AZF_CUSTOM_POLICY;
  });

  it('should amend the PDP configuration', (done) => {
    config_service.set_config(config, true);
    const azf = config_service.get_config().authorization.azf;

    should.equal(azf.protocol, 'http');
    should.equal(azf.host, 'authzforce.com');
    should.equal(azf.port, '9090');
    should.equal(azf.custom_policy, 'policy');
    done();
  });
});

describe('When authorization is disabled with environment variables', () => {
  beforeEach(() => {
    process.env.PEP_PROXY_AUTH_ENABLED = 'false';
  });

  afterEach(() => {
    delete process.env.PEP_PROXY_AUTH_ENABLED;
  });
  it('should remove the authorization config', (done) => {
    config_service.set_config(config, true);
    const authorization = config_service.get_config().authorization;
    authorization.should.be.empty();
    done();
  });
});
