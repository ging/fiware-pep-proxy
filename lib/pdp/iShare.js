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
  // If no type found in the payload, set it to check for null
  data.payload_types = data.payload_types || [null];

  const result = data.payload_types.every((type) => {
    return policy_sets.some((policy_set) => {
      // Policies are permissive, at least one policy
      // from the collection of policy sets must fire.
      return policy_set.policies.some((policy) => {
        const ruleEffect = policy.rules[0].effect === 'Permit';
        let fireRule = true;

        // The action of the request must be found in the
        // array of actions found in the policy
        if (policy.target.actions) {
          fireRule = policy.target.actions.some((action) => {
            return action.toUpperCase() === data.action;
          });
        }

        // If a type is defined, the payload must have a type
        // and that type must match directly
        if (fireRule && policy.target.resource.type) {
          fireRule = !!type && type === policy.target.resource.type;
        }

        // If Ids are found in the policy, they must  match a regex
        if (fireRule && policy.target.resource.identifiers && data.payload_entity_ids) {
          data.payload_entity_ids.every((id) => {
            fireRule = policy.target.resource.identifiers.some((identifier) => {
              const regex = new RegExp(identifier, 'i');
              return regex.test(id);
            });
          });
        }

        // If attributes are found in the policy, they must  match a regex
        if (fireRule && policy.target.resource.attributes && data.payload_entity_attrs) {
          data.payload_entity_attrs.every((attr) => {
            fireRule = policy.target.resource.attributes.some((attribute) => {
              const regex = new RegExp(attribute, 'i');
              return regex.test(attr);
            });
          });
        }

        return fireRule ? ruleEffect : !ruleEffect;
      });
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
