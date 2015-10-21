var config = require('../config.js'),
    proxy = require('./HTTPClient.js'),
    xml2json = require('xml2json'),
    escapeXML = require('escape-html');

var log = require('./logger').logger.getLogger("AZF-Client");

var AZF = (function() {

    var check_permissions = function(auth_token, user_info, resource, action, callback, callbackError) {

        log.info('Checking auth with AZF...');

        var roles = get_roles(user_info);
        var app_id = user_info.app_id;

        checkRESTPolicy(roles, resource, action, app_id, auth_token, callback, callbackError);
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

    var checkRESTPolicy = function (roles, resource, action, app_id, auth_token, success, error) {
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
                            }
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

        xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + xml2json.toXml(XACMLPolicy);

        log.debug('XML: ', xml);
        sendData(xml, auth_token, success, error);
    };

    var sendData = function(xml, auth_token, success, error) {
    
        var options = {
            host: config.azf.host,
            port: config.azf.port,
            path: config.azf.path,
            method: 'POST',
            headers: {
                'X-Auth-Token': auth_token,
                'Accept': 'application/xml',
                'Content-Type': 'application/xml'
            }
        };

        proxy.sendData('https', options, xml, undefined, function (status, resp) {
            var json_res = JSON.parse(xml2json.toJson(resp));
            var decision = json_res.Response.Result.Decision;
            log.debug('Decision: ', decision);
            if (decision === 'Permit') {
                success();
            } else {
                error(401, 'User not authorized in AZF for the given action and resource');
            }
        }, error);
    };

    return {
        check_permissions: check_permissions
    }

})();
exports.AZF = AZF;