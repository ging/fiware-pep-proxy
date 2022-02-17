/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const config_service = require('../config_service');
const debug = require('debug')('pep-proxy:OPA-Client');
const got = require('got');

/**
 * Can the Open Policy PDP check payloads?
 */
exports.payload_enabled = true;
/**
 * Can the Open Policy PDP check JWT?
 */
exports.jwt_enabled = false;

function getUrl() {
  const pdp = config_service.get_config().authorization.opa;
  return (pdp.ssl ? 'https://' : 'http://') + pdp.host + ':' + pdp.port + pdp.path;
}

/**
 * Make request to the Open Policy Agent endpoint and interpret the result
 *
 * @param token - authorization token.
 * @param data - A bag of data  holding the action, resources, payload etc.
 *               this will be used to make the decision
 *
 *
 * @return permit/deny
 */
exports.checkPolicies = function (token, data) {
  return new Promise((resolve, reject) => {
    return got
      .post(getUrl(), {
        headers: {
          'X-Auth-Token': token
        },
        json: getPolicy(data)
      })
      .json()
      .then((result) => {
        debug(result);
        return resolve(result.allow);
      })
      .catch((error) => {
        if (error instanceof got.HTTPError) {
          return resolve(false);
        }
        debug('Error in OPA communication ', error);
        return reject(error);
      });
  });
};

/**
 *  Create a payload for making an Open Policy Agent request
 *  based on the action,resource,tenant and attributes
 *  @return OPA payload
 */
function getPolicy(data) {
  const action = data.action;
  const resource = data.resource;
  const roles = data.roles;
  const appId = data.appId;
  debug('Checking authorization to roles', roles, 'to do ', action, ' on ', resource, 'and app ', appId);
  const json = {
    appId,
    resource,
    roles,
    action,
    tenant: data.tenant_header,
    ids: data.payloadEntityIds,
    idPatterns: data.payloadIdPatterns,
    attrs: data.payloadAttrs,
    types: data.payloadTypes
  };

  debug('Open Policy Agent request: ', JSON.stringify(json));
  return json;
}
