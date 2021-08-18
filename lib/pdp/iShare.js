/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const debug = require('debug')('pep-proxy:iShare-Client');

/**
 * Can the iSHARE PDP check payloads?
 */
exports.payload_enabled = true;
/**
 * Can the iSHARE PDP authorize via JWT?
 */
exports.jwt_enabled = true;

/**
 * Apply the attached policy to the payload & interpret the result
 *
 * @param req - the incoming request
 * @param data - A bag of data  holding the action, resources, payload etc.
 *               this will be used to make the decision
 *
 * @return permit/deny
 */

/* eslint-disable-next-line no-unused-vars */
exports.checkPolicies = function (token, data, ishare_policy, ishare_authregistry) {
  debug('Checking policy');

  const unix_timestamp = Math.floor(new Date().getTime() / 1000);
  if (!ishare_policy || !ishare_policy.policySets) {
    debug('No iSHARE Policy found');
    // TODO use the auth registry to retrieve a policy.
    return false;
  } else if (ishare_policy.notBefore > unix_timestamp) {
    debug('Attached iSHARE Policy not yet valid');
    return false;
  } else if (ishare_policy.notOnOrAfter <= unix_timestamp) {
    debug('Attached iSHARE Policy expired');
    return false;
  } else if (!validPayload(data, ishare_policy.policySets)) {
    debug('Attached iSHARE Policy disallows the request');
    return false;
  }
  return true;
};

// TODO: This currently does not deal with exception rules
function validPayload(data, policy_sets) {
  // If no type found in the payload, set it to check for null
  data.payloadTypes = data.payloadTypes || [null];
  const result = data.payloadTypes.every((type) => {
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

        // If a type is defined in a policy, the payload must have a type
        // and that type must equal the policy type directly
        if (fireRule && policy.target.resource.type) {
          fireRule = !!type && type === policy.target.resource.type;
        }

        // If ids are defined in the policy, and ids are found in the payload
        // the payload ids must match a regex
        if (fireRule && policy.target.resource.identifiers && data.payloadEntityIds) {
          fireRule = data.payloadEntityIds.every((id) => {
            return policy.target.resource.identifiers.some((identifier) => {
              const regex = new RegExp(identifier, 'i');
              return regex.test(id);
            });
          });
        }

        // If ids are defined in the policy, and idPatterns are found in the payload
        // the payload idPatterns must equal the policy id directly
        if (fireRule && policy.target.resource.identifiers && data.payloadIdPatterns) {
          fireRule = data.payloadIdPatterns.every((id) => {
            return policy.target.resource.identifiers.some((identifier) => {
              return identifier === id;
            });
          });
        }

        // If attributes are defined in the policy, and attributes are found in the payload
        // the payload attributes must match a regex
        if (fireRule && policy.target.resource.attributes && data.payloadEntityAttrs) {
          fireRule = data.payloadEntityAttrs.every((attr) => {
            return policy.target.resource.attributes.some((attribute) => {
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
