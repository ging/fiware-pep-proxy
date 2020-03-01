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

/*const coap_server = coap.createServer();

coap_server.on('request', Root.pep);

coap_server.listen(config.coap.port, null, function() {
  log.info('PEP Proxy with COAP available');
});*/


/**
 * Create COAPs server.
 */

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

if (config.coap.enabled) {
  server.on('error', (err) => {
    log.error(`server error:\n${err.stack}`);
    server.close();
  });

  server.on('message', async (msg, rinfo) => {
    let options_response = {
      reponse: '',
      t: 0,
      length: 0,
      port: rinfo.port,
      address: rinfo.address
    }
    Root.pep(msg, options_response)
  });

  server.on('listening', () => {
    log.info("COAP listening on " + config.coap.port);
  });

  server.bind(config.coap.port);
}

// COAPS
var index = require('./lib/dtls');

if (config.coaps.enabled) {

  let dtls;
  try {
    dtls = index.createDTLSServer(config.coaps.crt_file, config.coaps.key_file, config.coaps.port, "udp4")
  }
  catch (err) {
    if (err.code == "ENOENT") {
      log.error("Certificate and Key not found, generate new ones with the following command:\n  $ openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout cert.key -out cert.crt -subj '/CN=node-dtls-tunnel/O=m4n3dw0lf/C=BR'");
      process.exit(1)
    }
    else {
       throw err;
       process.exit(1)
    }
  }

  log.info("COAPs listening on " + config.coaps.port);

  if (typeof(dtls) != "undefined") {
    dtls.on( 'secureConnection', function( socket ) {
      socket.on( 'message', async function( message ) {
        Root.pep(message, socket)
      });
    });
  }
}
