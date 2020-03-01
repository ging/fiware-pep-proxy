const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
const config = require('./../config.js');
const dgram = require('dgram');
const packet = require('coap-packet');
  const generate = packet.generate;

const log = require('./logger').logger.getLogger('HTTP-Client');

exports.getClientIp = function(req, headers) {
  let forwardedIpsStr = '';

  for (const option of req.options) {
    if (option.name === 'Uri-Host') {
      forwardedIpsStr = option.value.toString('utf8');
    }
  }

  /*const ipAddress = req.connection.remoteAddress;

    let forwardedIpsStr = req.header('x-forwarded-for');

    if (forwardedIpsStr) {
        // 'x-forwarded-for' header may return multiple IP addresses in
        // the format: "client IP, proxy 1 IP, proxy 2 IP" so take the
        // the first one
        forwardedIpsStr += "," + ipAddress;
    } else {
        forwardedIpsStr = String(ipAddress);
    }*/

  headers['x-forwarded-for'] = forwardedIpsStr;

  return headers;
};

exports.sendData = function(
  protocol,
  options,
  data,
  res,
  socket,
  callBackOK,
  callbackError
) {
  options.headers = options.headers || {};

  callbackError =
    callbackError ||
    function(status, resp) {
      log.error('Error: ', status, resp);
      // Trasnform response from HTTP to COAP (Revisar porque COAP puede tener otros codigos distintos)
      let num = status;
      const digits = [];
      while (num > 0) {
        const numToPush = num % 10; // eslint-disable-line snakecase/snakecase
        digits.push(numToPush.toString());
        num = parseInt(num / 10); // eslint-disable-line snakecase/snakecase
      }
      digits.reverse().splice(1, 0, '.');
      res.code = digits.join('');
      res.payload = new Buffer(JSON.stringify(resp));

      if (config.coaps.enabled) {
        socket.send(generate(res));
      } else {
        const client = dgram.createSocket('udp4');
        res = generate(res);
        client.send(res, 0, res.length, socket.port, socket.address, function(
          error
        ) {
          client.close();
        });
      }
    };
  callBackOK =
    callBackOK ||
    function(status, resp, headers) {
      /*for (const idx in headers) {
            res.setHeader(idx, headers[idx]);
        }*/
      log.debug('Response: ', status);
      log.debug(' Body: ', resp);
      log.debug(' Body: ', headers);

      // Trasnform response from HTTP to COAP (Revisar porque COAP puede tener otros codigos distintos)
      let num = status;
      const digits = [];
      while (num > 0) {
        const numToPush = num % 10; // eslint-disable-line snakecase/snakecase
        digits.push(numToPush.toString());
        num = parseInt(num / 10); // eslint-disable-line snakecase/snakecase
      }
      digits.reverse().splice(1, 0, '.');
      res.code = digits.join('');
      res.payload = new Buffer(JSON.stringify(resp));

      if (config.coaps.enabled) {
        socket.send(generate(res));
      } else {
        const client = dgram.createSocket('udp4');
        res = generate(res);
        client.send(res, 0, res.length, socket.port, socket.address, function(
          error
        ) {
          client.close();
        });
      }
    };

  const url =
    protocol + '://' + options.host + ':' + options.port + options.path;
  const xhr = new XMLHttpRequest();
  xhr.open(options.method, url, true);
  if (options.headers['content-type']) {
    xhr.setRequestHeader('Content-Type', options.headers['content-type']);
  }
  for (const headerIdx in options.headers) {
    switch (headerIdx) {
      // Unsafe headers
      case 'host':
        break;
      case 'connection':
        break;
      case 'referer':
        break;
      //            case "accept-encoding":
      //            case "accept-charset":
      //            case "cookie":
      case 'content-type':
        break;
      case 'origin':
        break;
      default:
        xhr.setRequestHeader(headerIdx, options.headers[headerIdx]);
        break;
    }
  }

  xhr.onerror = function() {
    // DO NOTHING?
  };
  xhr.onreadystatechange = function() {
    // This resolves an error with Zombie.js
    if (flag) {
      return;
    }

    if (xhr.readyState === 4) {
      flag = true;

      if (xhr.status !== 0 && xhr.status < 400) {
        const allHeaders = xhr.getAllResponseHeaders().split('\r\n');
        const headers = {};
        for (const h in allHeaders) {
          headers[allHeaders[h].split(': ')[0]] = allHeaders[h].split(': ')[1];
        }
        callBackOK(xhr.status, xhr.responseText, headers);
      } else {
        callbackError(xhr.status, xhr.responseText);
      }
    }
  };

  let flag = false;
  log.debug('Sending ', options.method, ' to: ' + url);
  log.debug(' Headers: ', options.headers);
  log.debug(' Body: ', data);

  if (data !== undefined) {
    try {
      xhr.send(data);
    } catch (e) {
      callbackError(e.message);
    }
  } else {
    try {
      xhr.send();
    } catch (e) {
      callbackError(e.message);
    }
  }
};
