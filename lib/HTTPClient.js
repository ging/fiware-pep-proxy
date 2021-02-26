const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const debug = require('debug')('pep-proxy:HTTP-Client');

exports.getClientIp = function(req, headers) {
  const ipAddress = req.connection.remoteAddress;

  let forwardedIpsStr = req.header('x-forwarded-for');

  if (forwardedIpsStr) {
    // 'x-forwarded-for' header may return multiple IP addresses in
    // the format: "client IP, proxy 1 IP, proxy 2 IP" so take the
    // the first one
    forwardedIpsStr += "," + ipAddress;
  } else {
    forwardedIpsStr = String(ipAddress);
  }

  headers['x-forwarded-for'] = forwardedIpsStr;

  return headers;
};


exports.sendData = function(protocol, options, data, res, callBackOK, callbackError) {
    options.headers = options.headers || {};

    callbackError = callbackError || function(status, resp) {
        debug("Error: ", status, resp);
        res.statusCode = status;
        res.send(resp);
    };
    callBackOK = callBackOK || function(status, resp, headers) {
        res.statusCode = status;
        for (const idx in headers) {
            res.setHeader(idx, headers[idx]);
        }
        debug("Response: ", status);
        debug(" Body: ", resp);
        res.send(resp);
    };

    const url = protocol + "://" + options.host + ":" + options.port + options.path;
    const xhr = new XMLHttpRequest();
    xhr.open(options.method, url, true);
    if (options.headers["content-type"]) {
        xhr.setRequestHeader("Content-Type", options.headers["content-type"]);
    }
    for (const headerIdx in options.headers) {
        switch (headerIdx) {
            // Unsafe headers
            case "host":
                 break;
            case "connection":
                 break;
            case "referer":
                 break;
//            case "accept-encoding":
//            case "accept-charset":
//            case "cookie":
            case "content-type":
                 break;
            case "origin":
                break;
            default:
                xhr.setRequestHeader(headerIdx, options.headers[headerIdx]);
                break;
        }
    }

    xhr.onerror = function() {
        // DO NOTHING?
    }
    xhr.onreadystatechange = function () {

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
    debug("Sending ", options.method, " to: " + url);
    debug(" Headers: ", options.headers);
    //debug(" Body: ", data);
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
}