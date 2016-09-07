var config = require('../config.js'),
    proxy = require('./HTTPClient.js');

var log = require('./logger').logger.getLogger("IDM-Client");

var IDM = (function() {

    var my_token;

    var check_conn = function(callback, callbackError) {

        var options = {
            host: config.keystone_host,
            port: config.keystone_port,
            path: '/v3',
            method: 'GET'
        };
        proxy.sendData('http', options, undefined, undefined, callback, callbackError);
    };

    var authenticate = function(callback, callbackError) {

        var options = {
            host: config.keystone_host,
            port: config.keystone_port,
            path: '/v3/auth/tokens',
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        };
        var body = {
            auth: {
                identity: {
                    methods: ['password'], 
                    password: {
                        user: {
                            name: config.username, 
                            password: config.password, 
                            domain: {id: "default"}
                        }
                    }
                }
            }
        };
        proxy.sendData('http', options, JSON.stringify(body), undefined, function (status, resp, headers) {
            my_token = headers['x-subject-token'];
            callback(my_token);
        }, callbackError);
    };

    var check_token = function(token, callback, callbackError, cache) {

        var options;

        if (config.tokens_engine === 'keystone') {
            options = {
                host: config.keystone_host,
                port: config.keystone_port,
                path: '/v3/auth/tokens/',
                method: 'GET',
                headers: {
                    'X-Auth-Token': my_token,
                    'X-Subject-Token': encodeURIComponent(token),
                    'Accept': 'application/json'
                }
            };

        } else {
            options = {
                host: config.keystone_host,
                port: config.keystone_port,
                path: '/v3/access-tokens/' + encodeURIComponent(token),
                method: 'GET',
                headers: {'X-Auth-Token': my_token, 'Accept': 'application/json'}
            };
        }
        
        if (cache[token]) {
            log.info('Token in cache, checking timestamp...');
            var current_time = (new Date()).getTime();
            var token_time = cache[token].date.getTime();

            if (current_time - token_time < config.cache_time * 1000) {
                callback(cache[token].user_info);
                return;
            } else {
                log.info('Token in cache expired');
                delete cache[token];
            }
        }
        
        log.info('Checking token with IDM...');

        proxy.sendData('http', options, undefined, undefined, function (status, resp) {
            var user_info = JSON.parse(resp);
            cache[token] = {};
            cache[token].date = new Date();
            cache[token].user_info = user_info;
            callback(user_info);
        }, function (status, e) {
            if (status === 401) {

                log.error('Error validating token. Proxy not authorized in keystone. Keystone authentication ...');   
                authenticate (function (status, resp) {

                    my_token = JSON.parse(resp).access.token.id;

                    log.info('Success authenticating PEP proxy. Proxy Auth-token: ', my_token);
                    check_token(token, callback, callbackError);

                }, function (status, e) {
                    log.error('Error in IDM communication ', e);
                    callbackError(503, 'Error in IDM communication');
                });
            } else {
                callbackError(status, e);
            }
        });
    };


    return {
        check_conn: check_conn,
        authenticate: authenticate,
        check_token: check_token
    }

})();
exports.IDM = IDM;
