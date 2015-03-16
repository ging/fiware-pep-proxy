var config = require('../config.js'),
    proxy = require('./HTTPClient.js');


var IDM = (function() {

    var my_token;

    var authenticate = function(callback, callbackError) {

        var options = {
            host: config.keystone_host,
            port: config.keystone_port,
            path: '/v2.0/tokens',
            method: 'POST',
            headers: {}
        };
        var body = {auth: {passwordCredentials: {username: config.username, password: config.password}}}
        proxy.sendData('http', options, JSON.stringify(body), undefined, function (status, resp) {
            my_token = JSON.parse(resp).access.token.id;
            callback(my_token);
        }, callbackError);
    };

    var check_token = function(token, action, resource, callback, callbackError) {

        var options = {
            host: config.keystone_host,
            port: config.keystone_port,
            path: '/v2.0/access-tokens/' + encodeURIComponent(token),
            method: 'GET',
            headers: {'X-Auth-Token': my_token, 'Accept': 'application/json'}
        };
        
        if (action && resource) {
            options.path = '/v2.0/access-tokens/authREST/' + encodeURIComponent(token);
            options.headers = { 
                'X-Auth-Token': my_token,
                'x-auth-action': action,
                'x-auth-resource': resource,
                'Accept': 'application/json'
            };
        }
        
        proxy.sendData('http', options, undefined, undefined, callback, function (status, e) {
            if (status === 401) {

                console.log('Error validating token. Proxy not authorized in keystone. Keystone authentication ...');   
                authenticate (function (status, resp) {

                    my_token = JSON.parse(resp).access.token.id;

                    console.log('Success authenticating PEP proxy. Proxy Auth-token: ', my_token);
                    check_token(token, callback, callbackError);

                }, function (status, e) {
                    console.log('Error in IDM communication ', e);
                    callbackError(503, 'Error in IDM communication');
                });
            } else {
                callbackError(status, e);
            }
        });
    };


    return {
        authenticate: authenticate,
        check_token: check_token
    }

})();
exports.IDM = IDM;