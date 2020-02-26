const config = require('./config');
const Root = require('./controllers/root').Root;
const IDM = require('./lib/idm.js').IDM;
const async = require('async');
const coap = require('coap');

config.azf = config.azf || {};
config.https = config.https || {};

const log = require('./lib/logger').logger.getLogger('Server');

let retries = 0;
let idmConnected = false;

function retryCheck() {
  return !idmConnected && retries < 10;
}

function connectIDM(callback) {
  IDM.authenticate(
    function(token) {
      log.info('Success authenticating PEP proxy. Proxy Auth-token: ', token);
      idmConnected = true;
      callback();
    },
    function(status, e) {
      log.error('Error in IDM communication', e);
      callback();
    }
  );
}

function tryCreateConnection(callback) {
  const seconds = 5;

  retries++;

  if (retries === 1) {
    log.info(
      'Starting PEP proxy in port ' +
        config.pep_port_coap +
        '. IdM authentication ...'
    );
    connectIDM(callback);
  } else {
    log.info('Waiting %d seconds before attempting again.', seconds);
    setTimeout(() => {
      connectIDM(callback);
    }, seconds * 1000);
  }
}

function createConnectionHandler(error) {
  if (idmConnected) {
    log.info('Success authenticating PEP proxy.');
  } else {
    log.error('Error found after [%d] attempts: %s', retries, error);
    process.exit(1);
  }
}

async.whilst(retryCheck, tryCreateConnection, createConnectionHandler);

/**
 * Create COAP server.
 */

const coap_server = coap.createServer();

coap_server.on('request', Root.pep);

coap_server.listen(config.pep_port_coap, null, function() {
  log.info('PEP Proxy with COAP available');
});
