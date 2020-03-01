const dtls = require('node-dtls');
const fs = require('fs');

function dtlsServer(crt, key, port, type) {
  var key = fs.readFileSync(key);
  var crt = fs.readFileSync(crt);
  const server = dtls.createServer({ type, key, cert: crt });
  server.bind(port);
  return server;
}

module.exports.createDTLSServer = dtlsServer;
