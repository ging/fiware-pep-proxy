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
        var protocol = config.azf.ssl ? 'https' : 'http';
        proxy.sendData(protocol, options, undefined, undefined, callback, callbackError);
    };

    var check_permissions = function(auth_token, user_info, req, callback, callbackError, cache) {

        var roles = get_roles(user_info);
        var app_id = user_info.app_id;
        var azf_domain = user_info.app_azf_domain

        log.info('Checking auth with AZF...');
        //var xml = require('./../policies/' + config.azf.custom_policy).getPolicy(roles, req, app_id);
        var xml ="uu"

        if (!azf_domain) {
            callbackError(404, 'AZF domain not created for application ' + app_id);
        } else {
            sendData(xml, auth_token, azf_domain, function () {
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

        var protocol = config.azf.ssl ? 'https' : 'http';

        proxy.sendData(protocol, options, xml, undefined, function (status, resp) {
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
            
            decision = String(decision);

            log.debug('Decision: ', decision);
            if (decision.includes('Permit')) {
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
