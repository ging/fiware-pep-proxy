const config = require('./../config.js');
const proxy = require('./../lib/HTTPClient.js');
const IDM = require('./../lib/idm.js').IDM;
const AZF = require('./../lib/azf.js').AZF;
const jsonwebtoken = require('jsonwebtoken');

const log = require('./../lib/logger').logger.getLogger('Root');

const Root = (function() {
  //{token: {userInfo: {}, date: Date, verb1: [res1, res2, ..], verb2: [res3, res4, ...]}}
  const tokensCache = {};

  const pep = function(req, res) {
    const authToken = JSON.parse(req.payload.toString('utf8')).access_token;

    const organizationToken = req.headers[config.organizations.header]
      ? req.headers[config.organizations.header]
      : null;

    if (authToken === undefined) {
      log.error('Auth-token not found in request');

      res.code = '4.01';
      res.end('Auth-token not found in request header');
    } else {
      if (config.magic_key && config.magic_key === authToken) {
        const options = {
          host: config.app.host,
          port: config.app.port,
          path: req.url,
          method: req.method,
          headers: proxy.getClientIp(req, req.headers),
        };
        const protocol = config.app.ssl ? 'https' : 'http';
        proxy.sendData(protocol, options, req.body, res);
        return;
      }

      let action;
      let resource;
      let authzforce;

      if (config.authorization.enabled) {
        if (config.authorization.pdp === 'authzforce') {
          authzforce = true;
        } else {
          action = req.method;
          resource = req.path;
        }
      }

      if (config.pep.token.secret) {
        jsonwebtoken.verify(authToken, config.pep.token.secret, function(
          err,
          userInfo
        ) {
          if (err) {
            if (err.name === 'TokenExpiredError') {
              res.code = '4.01';
              res.end('Invalid token: jwt token has expired');
            } else {
              log.error('Error in JWT ', err.message);
              log.error('Or JWT secret bad configured');
              log.error('Validate Token with Keyrock');
              checkToken(
                req,
                res,
                authToken,
                null,
                action,
                resource,
                authzforce,
                organizationToken
              );
            }
          } else if (config.authorization.enabled) {
            if (config.authorization.pdp === 'authzforce') {
              authorizeAzf(req, res, authToken, userInfo);
            } else if (config.authorization.pdp === 'idm') {
              checkToken(
                req,
                res,
                authToken,
                userInfo.exp,
                action,
                resource,
                authzforce,
                organizationToken
              );
            } else {
              res.code = '4.01';
              res.end('User access-token not authorized');
            }
          } else {
            setHeaders(req, userInfo);
            redirRequest(req, res, userInfo);
          }
        });
      } else {
        checkToken(
          req,
          res,
          authToken,
          null,
          action,
          resource,
          authzforce,
          organizationToken
        );
      }
    }
  };

  const checkToken = function(
    req,
    res,
    authToken,
    jwtExpiration,
    action,
    resource,
    authzforce,
    organizationToken
  ) {
    IDM.checkToken(
      authToken,
      jwtExpiration,
      action,
      resource,
      authzforce,
      organizationToken,
      function(userInfo) {
        setHeaders(req, userInfo);
        if (config.authorization.enabled) {
          if (config.authorization.pdp === 'authzforce') {
            authorizeAzf(req, res, authToken, userInfo);
          } else if (userInfo.authorization_decision === 'Permit') {
            redirRequest(req, res, userInfo);
          } else {
            res.code = '4.01';
            res.end('User access-token not authorized');
          }
        } else {
          redirRequest(req, res, userInfo);
        }
      },
      function(status, e) {
        if (status === 404 || status === 401) {
          log.error(e);
          res.code = '4.01';
          res.end(JSON.stringify(e));
        } else {
          log.error('Error in IDM communication ', e);
          res.code = '5.03';
          res.end('Error in IDM communication');
        }
      },
      tokensCache
    );
  };

  const setHeaders = function(req, userInfo) {
    // Set headers with user information
    req.headers['X-Nick-Name'] = userInfo.id ? userInfo.id : '';
    req.headers['X-Display-Name'] = userInfo.displayName
      ? userInfo.displayName
      : '';
    req.headers['X-Roles'] = userInfo.roles
      ? JSON.stringify(userInfo.roles)
      : [];
    req.headers['X-Organizations'] = userInfo.organizations
      ? JSON.stringify(userInfo.organizations)
      : [];
    req.headers['X-Eidas-Profile'] = userInfo.eidas_profile
      ? JSON.stringify(userInfo.eidas_profile)
      : {};
    req.headers['X-App-Id'] = userInfo.app_id;
  };

  const authorizeAzf = function(req, res, authToken, userInfo) {
    // Check decision through authzforce
    AZF.checkPermissions(
      authToken,
      userInfo,
      req,
      function() {
        redirRequest(req, res, userInfo);
      },
      function(status, e) {
        if (status === 401) {
          log.error('User access-token not authorized: ', e);
          res.code = '4.01';
          res.end('User token not authorized');
        } else if (status === 404) {
          log.error('Domain not found: ', e);
          res.code = '4.04';
          res.end(JSON.stringify(e));
        } else {
          log.error('Error in AZF communication ', e);
          res.code = '5.03';
          res.end('Error in AZF communication');
        }
      },
      tokensCache
    );
  };

  const publicFunc = function(req, res) {
    redirRequest(req, res);
  };

  const redirRequest = function(req, res, userInfo) {
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
      headers: proxy.getClientIp(req, req.headers),
    };

    const payload_no_token = JSON.parse(req.payload.toString('utf8'));
    delete payload_no_token.access_token;

    proxy.sendData(
      protocol,
      options,
      Buffer.from(JSON.stringify(payload_no_token)),
      res
    );
  };

  return {
    pep,
    public: publicFunc,
  };
})();

exports.Root = Root;
