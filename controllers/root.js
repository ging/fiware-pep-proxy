var config = require('./../config.js'),
    proxy = require('./../lib/HTTPClient.js'),
    IDM = require('./../lib/idm.js').IDM,
    AZF = require('./../lib/azf.js').AZF;

var log = require('./../lib/logger').logger.getLogger("Root");

var Root = (function() {

    var pep = function(req, res) {
    	
    	var auth_token = req.headers['x-auth-token'];

        if (auth_token === undefined && req.headers['authorization'] !== undefined) {
            var header_auth = req.headers['authorization'].split(' ')[1];
            auth_token = new Buffer(header_auth, 'base64').toString();
        }

    	if (auth_token === undefined) {
            log.error('Auth-token not found in request header');
            var auth_header = 'IDM uri = ' + config.account_host;
            res.set('WWW-Authenticate', auth_header);
    		res.send(401, 'Auth-token not found in request header');
    	} else {

            if (config.magic_key && config.magic_key === auth_token) {
                var options = {
                    host: config.app_host,
                    port: config.app_port,
                    path: req.url,
                    method: req.method,
                    headers: proxy.getClientIp(req, req.headers)
                };
                proxy.sendData('http', options, req.body, res);
                return;

            }

    		IDM.check_token(auth_token, function (user_info) {

                if (config.azf.enabled) {
                    
                    AZF.check_permissions(auth_token, user_info, req, function () {

                        redir_request(req, res, user_info);

                    }, function (status, e) {
                        if (status === 401) {
                            log.error('User access-token not authorized: ', e);
                            res.send(401, 'User token not authorized');
                        } else if (status === 404) {
                            log.error('Domain not found: ', e);
                            res.send(404, e);
                        } else {
                            log.error('Error in AZF communication ', e);
                            res.send(503, 'Error in AZF communication');
                        }

                    });
                } else {
                    redir_request(req, res, user_info);
                }


    		}, function (status, e) {
    			if (status === 404) {
                    log.error('User access-token not authorized');
                    res.send(401, 'User token not authorized');
                } else {
                    log.error('Error in IDM communication ', e);
                    res.send(503, 'Error in IDM communication');
                }
    		});
    	};	
    };

    var public = function(req, res) {
        redir_request(req, res);
    };

    var redir_request = function (req, res, user_info) {

        if (user_info) {

            log.info('Access-token OK. Redirecting to app...');

            if (config.tokens_engine === 'keystone') {
                req.headers['X-Nick-Name'] = user_info.token.user.id;
                req.headers['X-Display-Name'] = user_info.token.user.id;
                req.headers['X-Roles'] = user_info.token.roles;
                req.headers['X-Organizations'] = user_info.token.project;
            } else {
                req.headers['X-Nick-Name'] = user_info.id;
                req.headers['X-Display-Name'] = user_info.displayName;
                req.headers['X-Roles'] = user_info.roles;
                req.headers['X-Organizations'] = user_info.organizations;
            }
        } else {
            log.info('Public path. Redirecting to app...');
        }

        var protocol = config.app_ssl ? 'https' : 'http';

        var options = {
            host: config.app_host,
            port: config.app_port,
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