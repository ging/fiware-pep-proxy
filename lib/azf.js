var config = require('../config.js'),
    proxy = require('./HTTPClient.js'),
    xml2json = require('xml2json'),
    escapeXML = require('escape-html'),
    xml2js = require('xml2js');
    
var log = require('./logger').logger.getLogger("AZF-Client");

var AZF = (function() {

    var check_conn = function(callback, callbackError) {

        var options = {
            host: config.azf.host,
            port: config.azf.port,
            path: '/',
            method: 'GET'
        };
        proxy.sendData(config.azf.protocol, options, undefined, undefined, callback, callbackError);
    };

    var check_permissions = function(auth_token, user_info, req, callback, callbackError, cache) {

        var roles = get_roles(user_info);
        var app_id = user_info.app_id;
        var azf_domain = user_info.app_azf_domain

        var xml;

        var action = req.method;
        var resource = req.url.split('?')[0].substring(1, req.url.split('?')[0].length);

        if (config.azf.custom_policy) {
            log.info('Checking auth with AZF...');
            xml = require('./../policies/' + config.azf.custom_policy).getPolicy(roles, req, app_id);
        } else {
            if (cache[auth_token] && 
                cache[auth_token][action] && 
                cache[auth_token][action].indexOf(resource) !== -1) {

                log.info('Permission in cache...');

                callback();
                return;
            }
            log.info('Checking auth with AZF...');
            xml = getRESTPolicy(roles, action, resource, app_id);
        }

        log.info('Checking auth with AZF...');

        if (!azf_domain) {
            callbackError(404, 'AZF domain not created for application' + app_id);
        } else {
            sendData(xml, auth_token, azf_domain, function () {
                // only caching basic authorization policies (verb + path)
                if (!config.azf.custom_policy && cache[auth_token]) {
                    
                    if (!cache[auth_token][action]) {
                        cache[auth_token][action] = [];
                        cache[auth_token][action].push(resource);
                    } else if (cache[auth_token][action] && cache[auth_token][action].indexOf(resource) === -1) {
                        cache[auth_token][action].push(resource);
                    }
                }
                callback();
            }, callbackError);
        }

    };

    var get_roles = function (user_info) {
        var roles = [];
        for (var orgIdx in user_info.organizations) {
            var org = user_info.organizations[orgIdx];
            for (var roleIdx in org.roles) {
                var role = org.roles[roleIdx];
                if (roles.indexOf(role.id) === -1) roles.push(role.id);
            }
        }

        for (roleIdx in user_info.roles) {
            role = user_info.roles[roleIdx];
            if (roles.indexOf(role) === -1) roles.push(role.id);
        }

        return roles;
    };

    var getRESTPolicy = function (roles, action, resource, app_id) {

        log.info("Checking authorization to roles", roles, "to do ", action, " on ", resource, "and app ", app_id);

        var XACMLPolicy = {
            "Request":{
                "xmlns":"urn:oasis:names:tc:xacml:3.0:core:schema:wd-17",
                "CombinedDecision": "false",
                "ReturnPolicyIdList":"false",
                "Attributes":[
                    {
                        "Category":"urn:oasis:names:tc:xacml:1.0:subject-category:access-subject",
                        "Attribute":[

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
                        "Category":"urn:oasis:names:tc:xacml:3.0:attribute-category:resource",
                        "Attribute":[
                            {
                                "AttributeId":"urn:oasis:names:tc:xacml:1.0:resource:resource-id",
                                "IncludeInResult": "false",
                                "AttributeValue":{
                                    "DataType":"http://www.w3.org/2001/XMLSchema#string",
                                    "$t": app_id
                                }
                            },
                            {
                                "AttributeId":"urn:thales:xacml:2.0:resource:sub-resource-id",
                                "IncludeInResult": "false",
                                "AttributeValue":{
                                    "DataType":"http://www.w3.org/2001/XMLSchema#string",
                                    "$t": escapeXML(resource)
                                }
                            }
                        ]
                    },
                    {
                        "Category":"urn:oasis:names:tc:xacml:3.0:attribute-category:action",
                        "Attribute":{
                            "AttributeId":"urn:oasis:names:tc:xacml:1.0:action:action-id",
                            "IncludeInResult": "false",
                            "AttributeValue":{
                                "DataType":"http://www.w3.org/2001/XMLSchema#string",
                                "$t": action
                            }
                        }
                    },
                    {
                        "Category":"urn:oasis:names:tc:xacml:3.0:attribute-category:environment"
                    }
                ]
            }
        };

        // create Attribute only roles is not empty because XACML schema requires that an Attribute has at least one AttributeValue
	if(roles.length > 0) {
           XACMLPolicy.Request.Attributes[0].Attribute[0] = 
                             {
                                "AttributeId":"urn:oasis:names:tc:xacml:2.0:subject:role",
                                "IncludeInResult": "false",
                                "AttributeValue": [
                                    // One per role
                                    // {
                                    // "DataType":"http://www.w3.org/2001/XMLSchema#string",
                                    // "$t":"Manager"
                                    // }
                                ]
                            };

          for (var i in roles) {
            XACMLPolicy.Request.Attributes[0].Attribute[0].AttributeValue[i] = {
                //"AttributeId":"urn:oasis:names:tc:xacml:2.0:subject:role",
                //"IncludeInResult": "false",
                //"AttributeValue":{
                    "DataType":"http://www.w3.org/2001/XMLSchema#string",
                    "$t": roles[i]
                //}
            };
          }
        }

        xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + xml2json.toXml(XACMLPolicy);

        log.debug('XML: ', xml);
        return xml;
    };

    var sendData = function(xml, auth_token, azf_domain, success, error) {

        var path = '/authzforce-ce/domains/' + azf_domain + '/pdp';
    
        var options = {
            host: config.azf.host,
            port: config.azf.port,
            path: path,
            method: 'POST',
            headers: {
                'X-Auth-Token': auth_token,
                'Accept': 'application/xml',
                'Content-Type': 'application/xml'
            }
        };

        proxy.sendData(config.azf.protocol, options, xml, undefined, function (status, resp) {
            log.debug("AZF response status: ", status);
            log.debug("AZF response: ", resp);
            var decision;
            // xml2json keeps namespace prefixes in json keys, which is not right because prefixes are not supposed to be fixed; only the namespace URIs they refer to
            // After parsing to JSON, we need to extract the Decision element in XACML namespace..
            // But there does not seem to be any good npm packge supporting namespace-aware XPath or equivalent evaluation on JSON. 
            // (xml2js-xpath will probably support namespaces in the next release: https://github.com/dsummersl/node-xml2js-xpath/issues/5 ) 
            // The easy way to go (but with inconvenients) is to get rid of prefixes.One way to refixes is to use npm package 'xml2js' with stripPrefix option.
            xml2js.parseString(resp, {tagNameProcessors: [xml2js.processors.stripPrefix]}, function(err, json_res) {
              log.debug("AZF response parsing result (JSON): ", json_res);
              log.debug("AZF response parsing error ('null' means no error): ", err);
              // xml2js puts child nodes in array by default, except on the root node (option 'explicitArray')
              decision = json_res.Response.Result[0].Decision[0];
            });
            
            log.debug('Decision: ', decision);
            if (decision === 'Permit') {
                success();
            } else {
                error(401, 'User not authorized in AZF for the given action and resource');
            }
        }, error);
    };

    return {
        check_permissions: check_permissions,
        check_conn: check_conn
    }

})();
exports.AZF = AZF;
