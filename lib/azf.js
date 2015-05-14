var config = require('../config.js'),
    proxy = require('./HTTPClient.js'),
    xml2json = require('xml2json');


var AZF = (function() {

    var check_permissions = function(auth_token, user_info, resource, action, callback, callbackError) {

        console.log('[TOKEN] Checking auth with AZF...');

        var roles = get_roles(user_info);

        checkRESTPolicy(roles, resource, action, auth_token, function(authorized) {
            if (authorized) {
                console.log("[AUTHORIZATION] User is authorized in AZF");
                callback();
            } else {
                console.log("[AUTHORIZATION] User is not authorized for the given action and resource");
                callbackError();
            }
        }, function() {
            res.send(503, 'Error in AZF communication');
        });

        
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

    var checkRESTPolicy = function (roles, path, action, auth_token, success, error) {
        console.log("Checking authorization to roles", roles, "to do ", action, " on ", path);

        var XACMLPolicy = {
            Request: {
                '$': {
                    xmlns: 'urn:oasis:names:tc:xacml:2.0:context:schema:os'
                },
                Subject: [ { 
                    '$': {
                        SubjectCategory: 'urn:oasis:names:tc:xacml:1.0:subject-category:access-subject'
                    },
                    Attribute: [{
                        '$': { 
                            AttributeId:'urn:oasis:names:tc:xacml:2.0:subject:role',
                            //AttributeId:'urn:oasis:names:tc:xacml:1.0:resource:resource-id',
                            DataType:'http://www.w3.org/2001/XMLSchema#string' 
                        }, 
                        AttributeValue: []
                    }]
                }],
                Resource: [{
                    Attribute: [{
                        '$': { 
                            AttributeId:'urn:oasis:names:tc:xacml:1.0:resource:resource-id',
                            //AttributeId:'urn:thales:xacml:2.0:resource:sub-resource-id',
                            DataType:'http://www.w3.org/2001/XMLSchema#string' 
                        },
                        AttributeValue: []
                    }]
                }],
                Action: [{
                    Attribute: [ {
                        '$': { 
                            AttributeId:'urn:oasis:names:tc:xacml:1.0:action:action-id',
                            DataType:'http://www.w3.org/2001/XMLSchema#string' 
                        },
                        AttributeValue: []
                    }]
                }],
                Environment: {      
                }, 
            }
        };

        for (var i in roles) {
            XACMLPolicy.Request.Subject[0].Attribute[0].AttributeValue[i] = roles[i]; 
        }
        XACMLPolicy.Request.Resource[0].Attribute[0].AttributeValue[0] = path;
        XACMLPolicy.Request.Action[0].Attribute[0].AttributeValue[0] = action;

        xml = xml2json.toXml(XACMLPolicy);

        sendData(xml, auth_token, success, error);
    };

    var sendData = function(xml, auth_token, success, error) {
    
        var options = {
            host: config.azf.host, 
            path: config.azf.path,
            method: 'POST',
            // key: fs.readFileSync(config.ac.key),
            // cert: fs.readFileSync(config.ac.cert),
            // ca: fs.readFileSync(config.ac.ca),
            headers: {
                'X-Auth-Token': auth_token
            }
        };

        var req = https.request(options, function(res) {
            //console.log("statusCode: ", res.statusCode);
            //console.log("headers: ", res.headers);

            var body = "";
            var parser = new x2js.Parser();

            res.on('data', function(d) {
                body += d;
                parser.parseString(body, function (err, result) {
                    // Responses: ["Permit", "NotApplicable"]
                    if (err) {
                        error();
                        console.log("Response from AC server for policy check: ", result.Response.Result[0].Decision[0]);  
                    } else {
                        if (result.Response.Result[0].Decision[0] === "Permit") {
                            success(true);
                        } else {
                            success(false);
                        }
                    }
                });
                //process.stdout.write(d);
            });
        });
        req.write(xml);
        req.end();

        req.on('error', function(e) {
            console.error(e);
        });
    };

    return {
        check_permissions: check_permissions
    }

})();
exports.AZF = AZF;