/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const config_service = require('../config_service');
const debug = require('debug')('pep-proxy:iShare-Client');
//const got = require('got');

function getUrl() {
  const pdp = config_service.get_config().authorization.ishare;
  return (pdp.ssl ? 'https://' : 'http://') + pdp.host + ':' + pdp.port;
}

/**
 * Can the iSHARE PDP check payloads?
 */
exports.payload_enabled = true;
/**
 * Can the iSHARE PDP authorize via JWT?
 */
exports.jwt_enabled = true;

/**
 * Make request to the iSHARE delegate endpoint and interpret the result
 *
 * @param req - the incoming request
 * @param data - A bag of data  holding the action, resources, payload etc.
 *               this will be used to make the decision
 *
 * @return permit/deny
 */
exports.checkPolicies = function (token, data, ishare_policy) {
  return new Promise((resolve, reject) => {
    debug('Checking policy');

    const unix_timestamp = Math.floor(new Date().getTime() / 1000);
    if (!ishare_policy || !ishare_policy.policySets) {
      debug('No iSHARE Policy found');
      return resolve(false);
    } else if (ishare_policy.notBefore > unix_timestamp) {
      debug('Attached iSHARE Policy not yet valid');
      return resolve(false);
    } else if (ishare_policy.notOnOrAfter <= unix_timestamp) {
      debug('Attached iSHARE Policy expired');
      return resolve(false);
    } else if (!valid_payload(data, ishare_policy.policySets)) {
      debug('Attached iSHARE Policy disallows the request');
      return resolve(false);
    }

    return resolve(true);

    /*

    return got
      .post('delegate', {
        prefixUrl: getUrl(),
        headers: {
          'X-Auth-Token': token
        },
        json: iShareBody(data)
      })
      .json()
      .then((result) => {
        return resolve(result.Response[0].Decision === 'Permit');
      })
      .catch((error) => {
        if (error instanceof got.HTTPError) {
          return resolve(false);
        }
        debug('Error in iShare communication ', error);
        return reject(error);
      });*/
  });
};

function valid_payload(data, policy_sets) {
  const result = policy_sets.some((policy_set) => {
    return policy_set.policies.some((policy) => {
      const ruleEffect = policy.rules[0].effect === 'Permit';
      let fireRule = true;

      if (policy.target.resource.type && data.payload_types) {
        fireRule = data.payload_types.length === 1 && data.payload_types[0] === policy.target.resource.type;
      }
      if (fireRule && policy.target.actions) {
        fireRule = policy.target.actions.some((action) => {
          return action.toUpperCase() === data.action;
        });
      }

      if (fireRule && policy.target.resource.identifiers && data.payload_entity_ids) {
        data.payload_entity_ids.forEach((id) => {
          fireRule = policy.target.resource.identifiers.some((identifier) => {
            const regex = new RegExp(identifier, 'i');
            return regex.test(id);
          });
        });
      }

      if (fireRule && policy.target.resource.attributes && data.payload_entity_attrs) {
        data.payload_entity_attrs.forEach((attr) => {
          fireRule = policy.target.resource.attributes.some((attribute) => {
            const regex = new RegExp(attribute, 'i');
            return regex.test(attr);
          });
        });
      }
      return fireRule ? ruleEffect : !ruleEffect;
    });
  });
  return result;
}

/**
 *  Create a payload for making an iSHARE request
 *  based on the action,resource,tenant and attributes
 */
function iShareBody(data) {
  const action = data.action;
  const resource = data.resource;
  const roles = data.roles;
  const appId = data.appId;
  debug('Checking authorization to roles', roles, 'to do ', action, ' on ', resource, 'and app ', appId);

  const json = {
    delegationRequest: {
      policyIssuer: 'EU.EORI.NL000000005',
      target: {
        accessSubject: 'EU.EORI.NL000000001'
      },
      policySets: [
        {
          policies: [
            {
              target: {
                resource: {
                  type: data.types,
                  identifiers: data.resource,
                  attributes: data.attrs
                },
                actions: [action],
                environment: {
                  serviceProviders: ['EU.EORI.NL000000003']
                }
              },
              rules: [
                {
                  effect: 'Permit'
                }
              ]
            }
          ]
        }
      ]
    }
  };
  debug('JSON: ', JSON.stringify(json));
  return json;
}
