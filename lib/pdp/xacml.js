/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const config_service = require('../config_service');
const debug = require('debug')('pep-proxy:XACML-Client');
const got = require('got');

/**
 * Can the XACML PDP check payloads?
 */
exports.payload_enabled = true;
/**
 * Can the XACML PDP check JWT?
 */
exports.jwt_enabled = false;

function getUrl() {
  const pdp = config_service.get_config().authorization.xacml;
  return (pdp.ssl ? 'https://' : 'http://') + pdp.host + ':' + pdp.port + pdp.path;
}

/**
 * Make request to the XACML JSON endpoint and interpret the result
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
        debug(JSON.stringify(result));
        return resolve(result.Response[0].Decision === 'Permit');
      })
      .catch((error) => {
        if (error instanceof got.HTTPError) {
          return resolve(false);
        }
        debug('Error in XACML communication ', error);
        return reject(error);
      });
  });
};

/**
 * Add an attribute to the XACML payload
 * @return Object
 */
function attribute(id, value) {
  return {
    AttributeId: id,
    Value: value
  };
}

/**
 *  Create a payload for making an XACML JSON request
 *  based on the action,resource,tenant and attributes
 *  @return XACML payload
 */
function getPolicy(data) {
  const action = data.action;
  const resource = data.resource;
  const roles = data.roles;
  const appId = data.appId;
  const tenant = data.tenant_header;
  debug('Checking authorization to roles', roles, 'to do ', action, ' on ', resource, 'and app ', appId);

  const resourceInfo = [
    attribute('urn:thales:xacml:2.0:resource:sub-resource-id', resource),
    attribute('urn:oasis:names:tc:xacml:1.0:resource:resource-id', appId)
  ];
  if (tenant) {
    resourceInfo.push(attribute('urn:ngsi-ld:resource:tenant', tenant));
  }
  if (data.payloadTypes) {
    resourceInfo.push(attribute('urn:ngsi-ld:resource:types', data.payloadTypes));
  }
  if (data.payloadAttrs) {
    resourceInfo.push(attribute('urn:ngsi-ld:resource:attrs', data.payloadAttrs));
  }
  if (data.payloadEntityIds) {
    resourceInfo.push(attribute('urn:ngsi-ld:resource:ids', data.payloadEntityIds));
  }
  if (data.payloadIdPatterns) {
    resourceInfo.push(attribute('urn:ngsi-ld:resource:id-patterns', data.payloadIdPatterns));
  }
  const json = {
    Request: {
      AccessSubject: {
        Attribute: [attribute('urn:oasis:names:tc:xacml:2.0:subject:role', roles)]
      },
      Action: {
        Attribute: [attribute('urn:oasis:names:tc:xacml:1.0:action:action-id', action)]
      },
      Resource: {
        Attribute: resourceInfo
      }
    }
  };

  debug('XACML request: ', JSON.stringify(json));
  return json;
}
