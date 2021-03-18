const config_service = require('./config_service.js');
const config = config_service.get_config();
const proxy = require('./HTTPClient.js');
const xml2json = require('xml2json');
const escapeXML = require('escape-html');
const xml2js = require('xml2js');

const debug = require('debug')('pep-proxy:AZF-Client');

const AZF = (function() {
  const checkConn = function(callback, callbackError) {
    const options = {
      host: config.azf.host,
      port: config.azf.port,
      path: '/',
      method: 'GET',
    };
    const protocol = config.azf.ssl ? 'https' : 'http';
    proxy.sendData(
      protocol,
      options,
      undefined,
      undefined,
      callback,
      callbackError
    );
  };

  const checkPermissions = function(
    authToken,
    userInfo,
    req,
    callback,
    callbackError,
    cache
  ) {
    const roles = getRoles(userInfo);
    const appId = userInfo.app_id;
    const azfDomain = userInfo.app_azf_domain;

    let xml;
    const action = req.method;
    const resource = req.path;

    if (config.authorization.azf.custom_policy) {
      debug('Checking custom policy with AZF...');
      xml = require('./../policies/' + config.azf.custom_policy).getPolicy(
        roles,
        req,
        appId
      );
    } else {
      if (
        cache[authToken] &&
        cache[authToken][action] &&
        cache[authToken][action].indexOf(resource) !== -1
      ) {
        debug('Permission in cache...');

        callback();
        return;
      }
      debug('Checking auth with AZF...');
      xml = getRESTPolicy(roles, action, resource, appId);
    }

    if (!azfDomain) {
      callbackError(404, 'AZF domain not created for application ' + appId);
    } else {
      sendData(
        xml,
        authToken,
        azfDomain,
        function() {
          // only caching basic authorization policies (verb + path)
          if (!config.authorization.azf.custom_policy && cache[authToken]) {
            if (!cache[authToken][action]) {
              cache[authToken][action] = [];
              cache[authToken][action].push(resource);
            } else if (
              cache[authToken][action] &&
              cache[authToken][action].indexOf(resource) === -1
            ) {
              cache[authToken][action].push(resource);
            }
          }

          callback();
        },
        callbackError
      );
    }
  };

  const getRoles = function(userInfo) {
    const roles = [];
    for (const orgIdx in userInfo.organizations) {
      const org = userInfo.organizations[orgIdx];
      for (const roleIdx in org.roles) {
        const role = org.roles[roleIdx];
        if (roles.indexOf(role.id) === -1) {
          roles.push(role.id);
        }
      }
    }

    for (const roleIdx in userInfo.roles) {
      const role = userInfo.roles[roleIdx];
      if (roles.indexOf(role) === -1) {
        roles.push(role.id);
      }
    }

    return roles;
  };

  const getRESTPolicy = function(roles, action, resource, appId) {
    debug(
      'Checking authorization to roles',
      roles,
      'to do ',
      action,
      ' on ',
      resource,
      'and app ',
      appId
    );

    const XACMLPolicy = {
      Request: {
        xmlns: 'urn:oasis:names:tc:xacml:3.0:core:schema:wd-17',
        CombinedDecision: 'false',
        ReturnPolicyIdList: 'false',
        Attributes: [
          {
            Category:
              'urn:oasis:names:tc:xacml:1.0:subject-category:access-subject',
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
            ],
          },
          {
            Category:
              'urn:oasis:names:tc:xacml:3.0:attribute-category:resource',
            Attribute: [
              {
                AttributeId:
                  'urn:oasis:names:tc:xacml:1.0:resource:resource-id',
                IncludeInResult: 'false',
                AttributeValue: {
                  DataType: 'http://www.w3.org/2001/XMLSchema#string',
                  $t: appId,
                },
              },
              {
                AttributeId: 'urn:thales:xacml:2.0:resource:sub-resource-id',
                IncludeInResult: 'false',
                AttributeValue: {
                  DataType: 'http://www.w3.org/2001/XMLSchema#string',
                  $t: escapeXML(resource),
                },
              },
            ],
          },
          {
            Category: 'urn:oasis:names:tc:xacml:3.0:attribute-category:action',
            Attribute: {
              AttributeId: 'urn:oasis:names:tc:xacml:1.0:action:action-id',
              IncludeInResult: 'false',
              AttributeValue: {
                DataType: 'http://www.w3.org/2001/XMLSchema#string',
                $t: action,
              },
            },
          },
          {
            Category:
              'urn:oasis:names:tc:xacml:3.0:attribute-category:environment',
          },
        ],
      },
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
        ],
      };

      for (const i in roles) {
        XACMLPolicy.Request.Attributes[0].Attribute[0].AttributeValue[i] = {
          //"AttributeId":"urn:oasis:names:tc:xacml:2.0:subject:role",
          //"IncludeInResult": "false",
          //"AttributeValue":{
          DataType: 'http://www.w3.org/2001/XMLSchema#string',
          $t: roles[i],
          //}
        };
      }
    }

    const xml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      xml2json.toXml(XACMLPolicy);

    debug('XML: ', xml);
    return xml;
  };

  const sendData = function(xml, authToken, azfDomain, success, error) {
    const path = '/authzforce-ce/domains/' + azfDomain + '/pdp';

    const options = {
      host: config.authorization.azf.host,
      port: config.authorization.azf.port,
      path,
      method: 'POST',
      headers: {
        'X-Auth-Token': authToken,
        Accept: 'application/xml',
        'Content-Type': 'application/xml',
      },
    };

    const protocol = config.authorization.azf.ssl ? 'https' : 'http';

    proxy.sendData(
      protocol,
      options,
      xml,
      undefined,
      function(status, resp) {
        debug('AZF response status: ', status);
        debug('AZF response: ', resp);
        let decision;
        // xml2json keeps namespace prefixes in json keys, which is not right because prefixes are not supposed to be fixed; only the namespace URIs they refer to
        // After parsing to JSON, we need to extract the Decision element in XACML namespace..
        // But there does not seem to be any good npm packge supporting namespace-aware XPath or equivalent evaluation on JSON.
        // (xml2js-xpath will probably support namespaces in the next release: https://github.com/dsummersl/node-xml2js-xpath/issues/5 )
        // The easy way to go (but with inconvenients) is to get rid of prefixes.One way to refixes is to use npm package 'xml2js' with stripPrefix option.
        xml2js.parseString(
          resp,
          { tagNameProcessors: [xml2js.processors.stripPrefix] },
          function(err, jsonRes) {
            debug('AZF response parsing result (JSON): ', jsonRes);
            debug(
              "AZF response parsing error ('null' means no error): ",
              err
            );
            // xml2js puts child nodes in array by default, except on the root node (option 'explicitArray')
            decision = jsonRes.Response.Result[0].Decision[0];
          }
        );

        decision = String(decision);

        debug('Decision: ', decision);
        if (decision.includes('Permit')) {
          success();
        } else {
          error(
            401,
            'User not authorized in AZF for the given action and resource'
          );
        }
      },
      error
    );
  };

  return {
    checkPermissions,
    checkConn,
  };
})();
exports.AZF = AZF;
