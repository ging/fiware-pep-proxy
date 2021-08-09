/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const config_service = require('../config_service');
const config = config_service.get_config();
const debug = require('debug')('pep-proxy:iShare-Client');
const got = require('got');
const KEYROCK_URL = (config.idm.ssl ? 'https://' : 'http://') + config.idm.host + ':' + config.idm.port;

/**
 * Make request to the iSHARE delegate endpoint and interpret the result
 *
 * @param req - the incoming request
 * @param data - A bag of data  holding the action, resources, payload etc.
 *               this will be used to make the decision
 *
 * @return permit/deny
 */
exports.checkPolicies = function (req, data) {
  return new Promise((resolve, reject) => {
    debug('Checking policy');
    return got
      .post('delegate', {
        prefixUrl: KEYROCK_URL,
        headers: {
          'X-Auth-Token': req.app.get('pepToken')
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
      });
  });
};

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
