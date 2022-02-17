/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const config_service = require('../config_service');
const debug = require('debug')('pep-proxy:IDM-Client');
const cache = require('../cache');
const got = require('got');

/**
 * Can the Keyrock PDP check payloads?
 */
exports.payload_enabled = false;
/**
 * Can the Keyrock PDP check JWT?
 */
exports.jwt_enabled = false;

function getUrl() {
  const idm = config_service.get_config().idm;
  return (idm.ssl ? 'https://' : 'http://') + idm.host + ':' + idm.port;
}
/**
 * The Permit/Deny decision will be found within the user data.
 *
 * @param user - the authorized User
 *
 * @return permit/deny
 */
exports.checkPolicies = function (user) {
  return user.authorization_decision === 'Permit';
};

/**
 *  When making a request to Keyrock ensure that the correct data is
 *  returned. When using Keyrock as a PDP, also include the action and
 *  resource. When using Authzforce as the PDP, ensure the domain is
 *  returned for further request.
 *
 * @param token - the PEP bearer token
 * @param action - the action the user is requesting
 * @param resource - the resource the user is requesting
 * @param tenant - the tenant or service path the user is requesting
 *
 * @return a URL to make the request to Keyrock
 */
function getPath(token, action, resource, tenant) {
  const authorization = config_service.get_config().authorization;
  const policy_decision_point = authorization.enabled ? authorization.pdp : undefined;
  let path =
    'user?access_token=' + encodeURIComponent(token.authToken) + '&app_id=' + config_service.get_config().pep.app_id;

  if (policy_decision_point === 'idm') {
    // Using Keyrock as combined IDM and PDP - get a permit/deny adjudication directly
    path = path + '&action=' + action;
    path = path + '&resource=' + resource;
    if (tenant) {
      path = path + '&authorization_service_header=' + tenant;
    }
  }
  if (policy_decision_point === 'azf') {
    // Using Authzforce as a PDP - get the location of the Authzforce PDP Domain
    path = path + '&authzforce=true';
  }

  return path;
}

/**
 * Check that the appId aligns with the PEP or its trusted apps.
 * @returns true if the application exists
 */
function checkApplication(appId, trusted_apps) {
  const pep = config_service.get_config().pep;
  return appId === pep.app_id || trusted_apps.indexOf(appId) !== -1 || pep.trusted_apps.indexOf(appId) !== -1;
}

/**
 * Check that a user has valid organizations
 * @returns true if the organizations are valid
 */
function checkOrganizations(organizations, organizationToken) {
  if (!config_service.get_config().organizations.enabled) {
    return true;
  }
  debug('User belongs to: ', organizations);
  debug('Token is in the scope of: ', organizationToken);

  return organizations.includes(organizationToken);
}

/**
 * Check that Keyrock is responding to requests
 */
exports.checkConnectivity = function () {
  return got('version', { prefixUrl: getUrl() });
};

/**
 * Contact Keyrock and check the PEP Token is valid.
 * @return the token and configuration for the PEP
 */
exports.authenticatePEP = function () {
  const pep = config_service.get_config().pep;
  return got
    .post('v3/auth/tokens', {
      prefixUrl: getUrl(),
      json: {
        name: pep.username,
        password: pep.password
      }
    })
    .then((response) => {
      const body = JSON.parse(response.body) || {};
      return { config: body.idm_authorization_config, pepToken: response.headers['x-subject-token'] };
    })
    .catch((error) => {
      throw error;
    });
};

/**
 *  Connect with Keyrock and see if the token is valid for the application
 *  When using Keyrock as a PDP this also returns a permit/deny response.
 *
 *  @param token - tokens to use in this request
 *  @param action - the action the user is requesting
 *  @param resource - the resource the user is requesting
 *  @param tenant - the tenant or service path the user is requesting
 *
 *  @return the user if found
 */
exports.authenticateUser = function (token, action, resource, tenant) {
  const authorization = config_service.get_config().authorization;
  return new Promise((resolve, reject) => {
    const authToken = token.authToken;
    const authOrgToken = token.authOrgToken;
    debug('Authenticating user');
    const cachedUser = cache.checkCache(authToken, token.jwtExpiry, action, resource);
    if (cachedUser) {
      return resolve(cachedUser);
    }

    return got(getPath(token, action, resource, tenant), {
      prefixUrl: getUrl(),
      headers: {
        'X-Auth-Token': token.pepToken,
        Accept: 'application/json'
      }
    })
      .then((response) => {
        const user = JSON.parse(response.body) || {};
        const organizations = user.organizations ? user.organizations.map((elem) => elem.id) : [];
        if (!checkApplication(user.app_id, user.trusted_apps)) {
          debug('User not authorized in application', config_service.get_config().pep.app_id);
          return reject({
            type: 'urn:dx:as:InvalidRole',
            message: 'User not have the required role in the application'
          });
        } else if (!checkOrganizations(organizations, authOrgToken)) {
          debug('User does not belong to the organization', authOrgToken);
          return reject({ type: 'urn:dx:as:InvalidRole', message: 'User does not belong to the organization' });
        }
        // Keyrock is in use as an IDM - store the User
        cache.storeUser(authToken, user);
        if (authorization.pdp === 'idm') {
          // Keyrock is also in use as a PDP - store the permissions.
          cache.storeAction(authToken, action, resource);
        }
        return resolve(user);
      })
      .catch((error) => {
        if (error instanceof got.HTTPError) {
          return reject({
            type: 'urn:dx:as:InvalidAuthenticationToken',
            message: 'User not authorized in the application'
          });
        }
        debug('Error in IDM communication ', error);
        return reject({ message: error.message });
      });
  });
};
