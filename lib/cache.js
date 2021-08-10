/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const isHex = require('is-hex');
const debug = require('debug')('pep-proxy:cache');
const config_service = require('./config_service');
const NodeCache = require('node-cache');
const cache = new NodeCache({
  stdTTL: config_service.get_config().cache_time,
  checkperiod: config_service.get_config().cache_time
});

/**
 * Add a user into the cache
 */
function storeUser(token, user) {
  cache.set(token, { date: new Date(), info: user });
}

/**
 *  Add an action+resource+token combo into the cache
 */
function storeAction(token, action, resource) {
  const user = cache.get(token);
  if (user) {
    if (!user[action]) {
      user[action] = [];
      user[action].push(resource);
    } else if (user[action] && user[action].indexOf(resource) === -1) {
      user[action].push(resource);
    }

    cache.set(token, user);
  }
}

/**
 *  Check if a user is found in the cache
 *  @return a user if a token for the given user is found and the token
 *  has not expired
 */
function checkTokenCache(token, jwtExpiration, action, resource) {
  const user = cache.get(token);
  const config = config_service.get_config();
  if (!user) {
    return undefined;
  }
  debug('Token found, checking timestamp...');
  debug(token);
  const currentTime = new Date().getTime();
  const tokenTime = token.length <= 40 && isHex(token) ? jwtExpiration * 1000 : user.date.getTime();

  if (currentTime - tokenTime > config.cache_time * 1000) {
    debug('Token in cache expired');
    cache.del(token);
    return undefined;
  }

  if (config.authorization.pdp === 'idm') {
    if (tokenPermission(token, action, resource)) {
      debug('Action-level permission in cache...');
    } else {
      return undefined;
    }
  }
  return user.info;
}

/**
 *  Check if an action+resource is found in the cache
 *  @return true if a token for the given action and resource is found
 */
function tokenPermission(token, action, resource) {
  const user = cache.get(token);
  return user && user[action] && user[action].indexOf(resource) !== -1;
}

exports.flush = function () {
  cache.flushAll();
};

exports.storeUser = storeUser;
exports.storeAction = storeAction;
exports.checkCache = checkTokenCache;
exports.tokenPermission = tokenPermission;
