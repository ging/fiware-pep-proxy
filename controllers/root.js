var config = require('./../config.js'),
    proxy = require('./../lib/HTTPClient.js'),
    IDM = require('./../lib/idm.js').IDM,
    AZF = require('./../lib/azf.js').AZF;

var log = require('./../lib/logger').logger.getLogger("Root");

var Root = (function() {

    //{token: {user_info: {}, date: Date, verb1: [res1, res2, ..], verb2: [res3, res4, ...]}}
    var tokens_cache = {};

    var pep = function(req, res) {
    	
        var token_header = req.headers['authorization'];
        var auth_token = token_header ? token_header.split('Bearer ')[1] : req.headers['x-auth-token'];

        if (auth_token === undefined && req.headers['authorization'] !== undefined) {
            var header_auth = req.headers['authorization'].split(' ')[1];
            auth_token = new Buffer(header_auth, 'base64').toString();
        }

    	if (auth_token === undefined) {
            log.error('Auth-token not found in request header');
            var auth_header = 'IDM uri = ' + config.idm_host;
            res.set('WWW-Authenticate', auth_header);
    		res.status(401).send('Auth-token not found in request header');
    	} else {

            if (config.magic_key && config.magic_key === auth_token) {
                var options = {
                    host: config.app.host,
                    port: config.app.port,
                    path: req.url,
                    method: req.method,
                    headers: proxy.getClientIp(req, req.headers)
                };
                var protocol = (config.app.ssl  === true) ? 'https' : 'http';
                proxy.sendData(protocol, options, req.body, res);
                return;

            }

            var action = undefined
            var resource = undefined
            var authzforce = undefined

            if (config.authorization.enabled) {
                if (config.authorization.pdp === 'authzforce') {
                    authzforce = true
                } else {
                    action = req.method;
                    resource = req.path;
                }
            }

    		IDM.check_token(auth_token, action, resource, authzforce, function (user_info) {

                // Set headers with user information
                req.headers['X-Nick-Name'] = user_info.id;
                req.headers['X-Display-Name'] = user_info.displayName;
                req.headers['X-Roles'] = JSON.stringify(user_info.roles);
                req.headers['X-Organizations'] = JSON.stringify(user_info.organizations);

                if (config.authorization.enabled) {

                    if (config.authorization.pdp === 'authzforce') {
                       
                        // Check decision through authzforce
                        AZF.check_permissions(auth_token, user_info, req, function () {

                            redir_request(req, res, user_info);

                        }, function (status, e) {
                            if (status === 401) {
                                log.error('User access-token not authorized: ', e);
                                res.status(401).send('User token not authorized');
                            } else if (status === 404) {
                                log.error('Domain not found: ', e);
                                res.status(404).send(e);
                            } else {
                                log.error('Error in AZF communication ', e);
                                res.status(503).send('Error in AZF communication');
                            }

                        }, tokens_cache);
                    } else {

                        // Check decision through idm
                        if (user_info.authorization_decision === "Permit") {
                            redir_request(req, res, user_info);
                        } else {
                            res.status(401).send('User access-token not authorized');
                        }

                    }
                } else {
                    redir_request(req, res, user_info);
                }

    		}, function (status, e) {

    			if (status === 404 || status === 401) {
                    log.error(e);
                    res.status(401).send(e);
                } else {
                    log.error('Error in IDM communication ', e);
                    res.status(503).send('Error in IDM communication');
                }
    		}, tokens_cache);
    	};	
    };

    var public = function(req, res) {
        redir_request(req, res);
    };

    var redir_request = function (req, res, user_info) {

        if (user_info) {
            log.info('Access-token OK. Redirecting to app...');
        } else {
            log.info('Public path. Redirecting to app...');
        }

        var protocol = (config.app.ssl   === true) ? 'https' : 'http';

        var options = {
            host: config.app.host,
            port: config.app.port,
            path: req.url,
            method: req.method,
            headers: proxy.getClientIp(req, req.headers)
        };
        proxy.sendData(protocol, options, req.body, res);
    };

    return {
        pep: pep,
        public: public
    }
})();

exports.Root = Root;