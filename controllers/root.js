/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const config_service = require('../lib/config_service');
let config;
const IDM = require('../lib/pdp/keyrock');
const jsonwebtoken = require('jsonwebtoken');
const access = require('../lib/access_functions');
const PDP = require('../lib/authorization_functions');
const debug = require('debug')('pep-proxy:root');

/**
 * Authenticate the JWT token and then authorize the action if necessary.
 *
 * @param req - the incoming request
 * @param res - the response to return
 * @param tokens - a collection of auth tokens to use for this verification
 */
function validateAccessJWT(req, res, tokens) {
  return jsonwebtoken.verify(tokens.authToken, config.pep.token.secret, function (err, userInfo) {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return access.deny(res, 'Invalid token: jwt token has expired', 'urn:dx:as:ExpiredAuthenticationToken');
      } else {
        debug('Error in JWT ', err.message);
        debug('Or JWT secret misconfigured');
        debug('Validate Token with Keyrock');
        // Fallback to AuthToken access validation
        return validateAccessIDM(req, res, tokens);
      }
    }
    req.user = userInfo;
    if (!config.authorization.enabled) {
      // JWT Authentication Access granted
      setHeaders(req);
      return access.permit(req, res);
    }

    if (PDP.validateJWT()) {
      // JWT Authorization by PDP
      return PDP.authorize(req, res, tokens.authToken);
    } else {
      // JWT Authorization by IDM, the user will already exist.
      tokens.jwtExpiry = userInfo.exp;
      return validateAccessIDM(req, res, tokens);
    }
  });
}

/**
 * Authenticate the user token via Keyrock and then authorize the action if necessry.
 *
 * @param req - the incoming request
 * @param res - the response to return
 * @param tokens - a collection of auth tokens to use for this verification
 */
async function validateAccessIDM(req, res, tokens) {
  const tenant_header = config.authorization.header ? req.get(config.authorization.header) : undefined;

  try {
    req.user = await IDM.authenticateUser(tokens, req.method, req.path, tenant_header);
    setHeaders(req);
    if (config.authorization.enabled) {
      return PDP.authorize(req, res, tokens.authToken);
    } else {
      //  Authentication only.
      return access.permit(req, res);
    }
  } catch (e) {
    debug(e);
    if (e.type) {
      return access.deny(res, e.message, e.type);
    } else {
      return access.internalError(res, e, 'IDM');
    }
  }
}

/**
 * Set headers with user information
 * @param req - the incoming request
 */
function setHeaders(req) {
  const user = req.user || {};
  req.headers['X-Nick-Name'] = user.id ? user.id : '';
  req.headers['X-Display-Name'] = user.displayName ? user.displayName : '';
  req.headers['X-Roles'] = user.roles ? JSON.stringify(user.roles) : [];
  req.headers['X-Organizations'] = user.organizations ? JSON.stringify(user.organizations) : [];
  req.headers['X-Eidas-Profile'] = user.eidas_profile ? JSON.stringify(user.eidas_profile) : {};
  req.headers['X-App-Id'] = user.app_id;
}

/**
 * Extract the bearer token for the user, organization and the PEP itself
 *
 * @param req - the incoming request
 */
function getTokens(req) {
  const tokenHeader = req.get('authorization');
  const pepToken = req.app.get('pepToken');
  const authOrgToken = config.organizations.header ? req.get(config.organizations.header) : undefined;
  let authToken = tokenHeader ? tokenHeader.split('Bearer ')[1] : req.get('x-auth-token');

  if (authToken === undefined && req.headers.authorization !== undefined) {
    const headerAuth = req.headers.authorization.split(' ')[1];
    authToken = Buffer.from(headerAuth, 'base64').toString();
  }

  return { authToken, authOrgToken, pepToken };
}

/**
 * For most requests, check the headers and permit or deny access.
 *
 * @param req - the incoming request
 * @param res - the response to return
 */
exports.restricted_access = function (req, res) {
  config = config_service.get_config();
  const tokens = getTokens(req, res);

  if (tokens.authToken === undefined) {
    debug('Auth-token not found in request header');
    res.set('WWW-Authenticate', 'IDM uri = ' + config.idm_host);
    access.deny(res, 'Auth-token not found in request header', 'urn:dx:as:MissingAuthenticationToken');
    return;
  }
  if (config.magic_key && config.magic_key === tokens.authToken) {
    access.permit(req, res);
    return;
  }
  if (config.pep.token.secret) {
    validateAccessJWT(req, res, tokens);
  } else {
    validateAccessIDM(req, res, tokens);
  }
};

/**
 * Allow access to whitelisted resources
 */
exports.open_access = access.permit;
