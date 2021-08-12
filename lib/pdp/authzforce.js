/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const config_service = require('../config_service');
const xml2json = require('xml2json');
const escapeXML = require('escape-html');
const xml2js = require('xml2js');
const got = require('got');

const debug = require('debug')('pep-proxy:AZF-Client');
const cache = require('../cache');

/**
 * Can the Authzforce PDP check payloads?
 *
 * Not yet, but the Authzforce policies could be reconfigured to check payloads at
 * some point
 */
exports.payload_enabled = false;
/**
 * Can the Authzforce PDP authorize via a JWT?
 */
exports.jwt_enabled = true;

function getUrl() {
  const pdp = config_service.get_config().authorization.azf;
  return (pdp.ssl ? 'https://' : 'http://') + pdp.host + ':' + pdp.port;
}

/**
 * Check that Authzforce is available and responding to requests
 */
exports.checkConnectivity = function () {
  return got('', { prefixUrl: getUrl() });
};

/**
 * Make request to the Authzforce PDP and interpret the result
 *
 * @param authToken - the authToken for Authzforce
 * @param data - A bag of data  holding the action, resources, payload etc.
 *               this will be used to make the decision
 * @param req - the incoming request for custom policies
 *
 * @return permit/deny
 */
exports.checkPolicies = function (authToken, data, req) {
  const azf = config_service.get_config().authorization.azf;

  return new Promise((resolve, reject) => {
    let xml;
    const action = data.action;
    const resource = data.resource;
    const roles = data.roles;
    const appId = data.appId;

    if (!data.azfDomain) {
      return reject({ status: 404, message: 'AZF domain not created for application ' + appId });
    }
    if (cache.tokenPermission(authToken, action, resource)) {
      debug('Permission in cache...');
      return resolve(true);
    }

    if (azf.custom_policy) {
      debug('Checking custom policy with AZF...');
      xml = require('./../policies/' + azf.custom_policy).getPolicy(roles, req, appId);
    } else {
      xml = getRESTPolicy(roles, action, resource, appId);
    }
    return got
      .post('authzforce-ce/domains/' + data.azfDomain + '/pdp', {
        prefixUrl: getUrl(),
        headers: {
          'X-Auth-Token': authToken,
          Accept: 'application/xml',
          'Content-Type': 'application/xml'
        },
        body: xml
      })
      .then((response) => {
        debug('AZF response status: ', response.statusCode);
        debug(response.body);

        // xml2json keeps namespace prefixes in json keys, which is not right because prefixes are not supposed to be fixed; only the namespace URIs they refer to
        // After parsing to JSON, we need to extract the Decision element in XACML namespace..
        // But there does not seem to be any good npm packge supporting namespace-aware XPath or equivalent evaluation on JSON.
        // (xml2js-xpath will probably support namespaces in the next release: https://github.com/dsummersl/node-xml2js-xpath/issues/5 )
        // The easy way to go (but with inconvenients) is to get rid of prefixes.One way to refixes is to use npm package 'xml2js' with stripPrefix option.
        xml2js.parseString(response.body, { tagNameProcessors: [xml2js.processors.stripPrefix] }, (err, json) => {
          if (err) {
            return reject(err);
          }
          // xml2js puts child nodes in array by default, except on the root node (option 'explicitArray')
          const decision = json.Response.Result[0].Decision[0].includes('Permit');
          if (decision && !azf.custom_policy) {
            cache.storeAction(authToken, action, resource);
          }
          return resolve(decision);
        });
      })
      .catch((error) => {
        if (error instanceof got.HTTPError) {
          return resolve(false);
        }
        debug('Error in Authzforce communication ', error);
        return reject(error);
      });
  });
};

/**
 *  Create a payload for making an XACML request to Authzforce
 *  based on the action,resource,tenant and attributes
 * @return XML payload
 */
const getRESTPolicy = function (roles, action, resource, appId) {
  debug('Checking authorization to roles', roles, 'to do ', action, ' on ', resource, 'and app ', appId);

  const XACMLPolicy = {
    Request: {
      xmlns: 'urn:oasis:names:tc:xacml:3.0:core:schema:wd-17',
      CombinedDecision: 'false',
      ReturnPolicyIdList: 'false',
      Attributes: [
        {
          Category: 'urn:oasis:names:tc:xacml:1.0:subject-category:access-subject',
          Attribute: [
            // ?????
            // {
            //     "AttributeId":"urn:oasis:names:tc:xacml:1.0:subject:subject-id",
            //     "IncludeInResult": "false",
            //     "AttributeValue":{
            //         "DataType":"http://www.w3.org/2001/XMLSchema#string",
            //         "$t":"joe"
            //     }
            // },
            // Include the role Attribute if and only if the user has at least one role, since the XACML schema requires at least one AttributeValue in a <Attribute> element
            //{
            //    "AttributeId":"urn:oasis:names:tc:xacml:2.0:subject:role",
            //    "IncludeInResult": "false",
            //    "AttributeValue": [
            // One per role
            // {
            // "DataType":"http://www.w3.org/2001/XMLSchema#string",
            // "$t":"Manager"
            // }
            //    ]
            //}
          ]
        },
        {
          Category: 'urn:oasis:names:tc:xacml:3.0:attribute-category:resource',
          Attribute: [
            {
              AttributeId: 'urn:oasis:names:tc:xacml:1.0:resource:resource-id',
              IncludeInResult: 'false',
              AttributeValue: {
                DataType: 'http://www.w3.org/2001/XMLSchema#string',
                $t: appId
              }
            },
            {
              AttributeId: 'urn:thales:xacml:2.0:resource:sub-resource-id',
              IncludeInResult: 'false',
              AttributeValue: {
                DataType: 'http://www.w3.org/2001/XMLSchema#string',
                $t: escapeXML(resource)
              }
            }
          ]
        },
        {
          Category: 'urn:oasis:names:tc:xacml:3.0:attribute-category:action',
          Attribute: {
            AttributeId: 'urn:oasis:names:tc:xacml:1.0:action:action-id',
            IncludeInResult: 'false',
            AttributeValue: {
              DataType: 'http://www.w3.org/2001/XMLSchema#string',
              $t: action
            }
          }
        },
        {
          Category: 'urn:oasis:names:tc:xacml:3.0:attribute-category:environment'
        }
      ]
    }
  };

  // create Attribute only roles is not empty because XACML schema requires that an Attribute has at least one AttributeValue
  if (roles.length > 0) {
    XACMLPolicy.Request.Attributes[0].Attribute[0] = {
      AttributeId: 'urn:oasis:names:tc:xacml:2.0:subject:role',
      IncludeInResult: 'false',
      AttributeValue: [
        // One per role
        // {
        // "DataType":"http://www.w3.org/2001/XMLSchema#string",
        // "$t":"Manager"
        // }
      ]
    };

    for (const i in roles) {
      XACMLPolicy.Request.Attributes[0].Attribute[0].AttributeValue[i] = {
        //"AttributeId":"urn:oasis:names:tc:xacml:2.0:subject:role",
        //"IncludeInResult": "false",
        //"AttributeValue":{
        DataType: 'http://www.w3.org/2001/XMLSchema#string',
        $t: roles[i]
        //}
      };
    }
  }

  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + xml2json.toXml(XACMLPolicy);

  debug(xml);
  return xml;
};
