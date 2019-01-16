const config = require('../config.js');
const proxy = require('./HTTPClient.js');
const isHex = require('is-hex');

const log = require('./logger').logger.getLogger("IDM-Client");

const IDM = (function() {

    let myToken;

    const checkConn = function(callback, callbackError) {

        const options = {
            host: config.idm.host,
            port: config.idm.port,
            path: '/version',
            method: 'GET'
        };
        const protocol = config.idm.ssl ? 'https' : 'http';
        proxy.sendData(protocol, options, undefined, undefined, callback, callbackError);
    };

    const authenticate = function(callback, callbackError) {

        const options = {
            host: config.idm.host,
            port: config.idm.port,
            path: '/v3/auth/tokens',
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        };
        const protocol = config.idm.ssl ? 'https' : 'http';
        const body = {
            name: config.pep.username, 
            password: config.pep.password
        };

        proxy.sendData(protocol, options, JSON.stringify(body), undefined, function (status, resp, headers) {
            const response = JSON.parse(resp)
            if (response.idm_authorization_config) {
                log.info("IDM authorization configuration:")
                log.info(" + Authzforce enabled: " + response.idm_authorization_config.authzforce)
                const rules = (response.idm_authorization_config.level === 'advanced') 
                    ? "HTTP Verb+Resource and Advanced" 
                    : "HTTP Verb+Resource" 
                log.info(" + Authorization rules allowed: " + rules)
            }

            myToken = headers['x-subject-token'];
            callback(myToken);
        }, callbackError);
    };

    const checkToken = function(token, jwtExpiration, action, resource, authzforce, callback, callbackError, cache) {

        let path =  '/user?access_token=' + encodeURIComponent(token)

        if (action && resource) {
            path = path + '&action=' + action
            path = path + '&resource=' + resource
            path = path + '&app_id=' + config.pep.app_id
        } else if (authzforce) {
            path = path + '&authzforce=' + authzforce
        }

        const options = {
            host: config.idm.host,
            port: config.idm.port,
            path,
            method: 'GET',
            headers: {'X-Auth-Token': myToken, 'Accept': 'application/json'}
        };

        const protocol = config.idm.ssl ? 'https' : 'http';
        
        checkTokenCache(token, jwtExpiration, action, resource, cache, function(cachedUserInfo) {
            if (cachedUserInfo) {
                callback(cachedUserInfo);
            } else {
                log.info('Checking token with IDM...');
                proxy.sendData(protocol, options, undefined, undefined, function (status, resp) {
                    const userInfo = JSON.parse(resp);

                    if (!checkApplication(userInfo.app_id)) {
                        log.error('User not authorized in application', config.pep.app_id);
                        callbackError(401, 'User not authorized in application', config.pep.app_id);
                    } else {
                        storeToken(token, userInfo, action, resource, cache)
                        callback(userInfo);
                    }
                }, function (status, e) {
                    log.error('Error in IDM communication ', e);
                    callbackError(status, (e) ? JSON.parse(e) : undefined);
                });
            }
        })
    };

    const checkTokenCache = function(token, jwtExpiration, action, resource, cache, callback) {

        if (cache[token]) {
            log.info('Token in cache, checking timestamp...');
            log.info(token)
            const currentTime = (new Date()).getTime();
            const tokenTime = (token.length <= 40 && isHex(token)) ? jwtExpiration*1000 : cache[token].date.getTime();

            if (currentTime - tokenTime < config.cache_time * 1000) {
                
                if (config.authorization.enabled && config.authorization.pdp === 'idm') {
                    if (cache[token] && 
                        cache[token][action] && 
                        cache[token][action].indexOf(resource) !== -1) {

                        log.info('Permission in cache...');

                        callback(cache[token].userInfo);
                    } else {
                        callback()
                    }
                } else {
                    callback(cache[token].userInfo);
                }

            } else {
                log.info('Token in cache expired');
                delete cache[token];
                callback();
            }
        } else {
            callback();
        }
    }

    const storeToken = function(token, userInfo, action, resource, cache) {
        cache[token] = {};
        cache[token].date = new Date();
        cache[token].userInfo = userInfo;

        if (config.authorization.enabled) {
            if (config.authorization.pdp === 'idm' && userInfo.authorization_decision === "Permit") {
                if (!cache[token][action]) {
                    cache[token][action] = [];
                    cache[token][action].push(resource);
                } else if (cache[token][action] && cache[token][action].indexOf(resource) === -1) {
                    cache[token][action].push(resource);
                }
            }
        }
    }

    const checkApplication = function (appId) {
        log.debug('Token created in application: ', appId);
        log.debug('PEP Proxy application: ', config.pep.app_id);
        log.debug('PEP Proxy trusted_apps: ', config.pep.trusted_apps);

        if (appId === config.pep.app_id || config.pep.trusted_apps.indexOf(appId) !== -1) {return true;}
        return false;
    }


    return {
        checkConn,
        authenticate,
        checkToken,
        checkTokenCache,
        storeToken
    }

})();
exports.IDM = IDM;