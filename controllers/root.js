const config = require('./../config.js');
const proxy = require('./../lib/HTTPClient.js');
const IDM = require('./../lib/idm.js').IDM;
const AZF = require('./../lib/azf.js').AZF;

const log = require('./../lib/logger').logger.getLogger("Root");

const Root = (function() {

    //{token: {userInfo: {}, date: Date, verb1: [res1, res2, ..], verb2: [res3, res4, ...]}}
    const tokensCache = {};

    const pep = function(req, res) {
    	
        const tokenHeader = req.headers.authorization;
        let authToken = tokenHeader ? tokenHeader.split('Bearer ')[1] : req.headers['x-auth-token'];

        if (authToken === undefined && req.headers.authorization !== undefined) {
            const headerAuth = req.headers.authorization.split(' ')[1];
            authToken = new Buffer(headerAuth, 'base64').toString();
        }

    	if (authToken === undefined) {
            log.error('Auth-token not found in request header');
            const authHeader = 'IDM uri = ' + config.idm_host;
            res.set('WWW-Authenticate', authHeader);
    		res.status(401).send('Auth-token not found in request header');
    	} else {

            if (config.magic_key && config.magic_key === authToken) {
                const options = {
                    host: config.app.host,
                    port: config.app.port,
                    path: req.url,
                    method: req.method,
                    headers: proxy.getClientIp(req, req.headers)
                };
                const protocol = config.app.ssl ? 'https' : 'http';
                proxy.sendData(protocol, options, req.body, res);
                return;

            }

            let action
            let resource
            let authzforce

            if (config.authorization.enabled) {
                if (config.authorization.pdp === 'authzforce') {
                    authzforce = true
                } else {
                    action = req.method;
                    resource = req.path;
                }
            }

    		IDM.checkToken(authToken, action, resource, authzforce, function (userInfo) {

                // Set headers with user information
                req.headers['X-Nick-Name'] = userInfo.id;
                req.headers['X-Display-Name'] = userInfo.displayName;
                req.headers['X-Roles'] = JSON.stringify(userInfo.roles);
                req.headers['X-Organizations'] = JSON.stringify(userInfo.organizations);

                if (config.authorization.enabled) {

                    if (config.authorization.pdp === 'authzforce') {
                       
                        // Check decision through authzforce
                        AZF.checkPermissions(authToken, userInfo, req, function () {

                            redirRequest(req, res, userInfo);

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

                        }, tokensCache);
                    } else  if (userInfo.authorization_decision === "Permit") {
                        redirRequest(req, res, userInfo);
                    } else {
                        res.status(401).send('User access-token not authorized');
                    }
                } else {
                    redirRequest(req, res, userInfo);
                }

    		}, function (status, e) {

    			if (status === 404 || status === 401) {
                    log.error(e);
                    res.status(401).send(e);
                } else {
                    log.error('Error in IDM communication ', e);
                    res.status(503).send('Error in IDM communication');
                }
    		}, tokensCache);
    	}	
    };

    const publicFunc = function(req, res) {
        redirRequest(req, res);
    };

    const redirRequest = function (req, res, userInfo) {

        if (userInfo) {
            log.info('Access-token OK. Redirecting to app...');
        } else {
            log.info('Public path. Redirecting to app...');
        }

        const protocol = config.app.ssl ? 'https' : 'http';

        const options = {
            host: config.app.host,
            port: config.app.port,
            path: req.url,
            method: req.method,
            headers: proxy.getClientIp(req, req.headers)
        };
        proxy.sendData(protocol, options, req.body, res);
    };

    return {
        pep,
        public: publicFunc
    }
})();

exports.Root = Root;