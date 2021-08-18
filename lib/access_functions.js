/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const config_service = require('./config_service');
const config = config_service.get_config();
const debug = require('debug')('pep-proxy:access');
const got = require('got');
const StatusCodes = require('http-status-codes').StatusCodes;
const getReasonPhrase = require('http-status-codes').getReasonPhrase;

const PROXY_URL = (config.app.ssl ? 'https://' : 'http://') + config.app.host + ':' + config.app.port;
const template = require('handlebars').compile(
  config.error_template ||
    `{
    "type": "{{type}}",
    "title": "{{title}}",
    "detail": "{{message}}"
  }`
);

const error_content_type = config.error_content_type || 'application/json';

/**
 * Add the client IP of the proxy client to the list of X-forwarded-for headers.
 *
 * @param req - the incoming request
 * @return a string representation of the X-forwarded-for header
 */
function getClientIp(req) {
  let ip = req.ip;
  if (ip.substr(0, 7) === '::ffff:') {
    ip = ip.substr(7);
  }
  let forwardedIpsStr = req.header('x-forwarded-for');

  if (forwardedIpsStr) {
    // 'x-forwarded-for' header may return multiple IP addresses in
    // the format: "client IP, proxy 1 IP, proxy 2 IP" so take the
    // the first one
    forwardedIpsStr += ',' + ip;
  } else {
    forwardedIpsStr = String(ip);
  }

  return forwardedIpsStr;
}

/**
 * Based on the PDP decision, decide whether to forward the request
 * or return "Access Denied" response
 *
 * @param req - the incoming request
 * @param res - the response to return
 * @param decision - the PDP decision permir/deny
 */
exports.adjudicate = function (req, res, decision) {
  if (decision) {
    permit(req, res);
  } else {
    deny(res, 'User access-token not authorized', 'urn:dx:as:InvalidRole');
  }
};

/**
 * Return an "Access Denied" response
 *
 * @param res - the response to return
 * @param message - the error message to display
 * @param type - the error type
 */
function deny(res, message, type) {
  debug('Denied. ' + type);
  res.setHeader('Content-Type', error_content_type);
  res.status(StatusCodes.UNAUTHORIZED).send(
    template({
      type,
      title: getReasonPhrase(StatusCodes.UNAUTHORIZED),
      message
    })
  );
}

/**
 * Return an "Internal Error" response. These should not occur
 * during standard operation
 *
 * @param res - the response to return
 * @param e - the error that occurred
 * @param component - the component that caused the error
 */
function internalError(res, e, component) {
  const message = e ? e.message : undefined;
  debug(`Error in ${component} communication `, message ? message : e);
  res.setHeader('Content-Type', error_content_type);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(
    template({
      type: 'urn:dx:as:InternalServerError',
      title: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      message
    })
  );
}

/**
 * "Access Permitted" forwarding when using the PEP with NGINX
 *
 * @param req - the incoming request
 * @param res - the response to return
 */
function nginxResponse(req, res) {
  debug('Permitted. Response 204');
  res.sendStatus(StatusCodes.NO_CONTENT);
}

/**
 * "Access Permitted" forwarding. Forward the proxied request and
 * return the response.
 *
 * @param req - the incoming request
 * @param res - the response to return
 */
function pepResponse(req, res) {
  const headers = req.headers;
  headers['x-forwarded-for'] = getClientIp(req);

  got(PROXY_URL + req.url, {
    method: req.method,
    headers,
    body: req.body,
    allowGetBody: true,
    throwHttpErrors: false,
    retry: 0
  })
    .then((response) => {
      debug(req.user ? 'Permitted.' : 'Public path.');
      res.statusCode = response.statusCode;
      res.headers = response.headers;
      return response.body ? res.send(response.body) : res.send();
    })
    .catch((error) => {
      return internalError(res, error, 'Proxy');
    });
}

const permit = 'auth_for_nginx' in config && config.auth_for_nginx ? nginxResponse : pepResponse;
exports.permit = permit;
exports.deny = deny;
exports.internalError = internalError;
