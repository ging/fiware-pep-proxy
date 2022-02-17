/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const _ = require('underscore');
const debug = require('debug')('pep-proxy:payload');

function getAttrs(obj, ids, types, attrs) {
  if (Array.isArray(obj)) {
    obj.forEach((element) => {
      getAttrs(element, ids, types, attrs);
    });
  } else {
    const keys = _.without(_.keys(obj), 'value', 'type', 'id', 'observedAt', 'metadata', 'unitCode');

    keys.forEach((key) => {
      if (Array.isArray(obj[key])) {
        getAttrs(obj[key], ids, types, attrs);
      } else {
        attrs.push(key);
      }
    });

    if (obj.id) {
      ids.push(obj.id);
    }
    if (obj.type) {
      types.push(obj.type);
    }
  }
}

/**
 * Check the payload body for attributes, types and ids
 */
exports.v2batch = function (req, res, next) {
  debug('v2batch');

  const ids = [];
  const attrs = [];
  const types = [];

  if (req.body) {
    const body = JSON.parse(req.body.toString());
    const entities = body.entities || [];
    getAttrs(entities, ids, types, attrs);
    res.locals.ids = _.uniq(ids);
    res.locals.attrs = _.uniq(attrs);
    res.locals.types = _.uniq(types);
  }
  next();
};

/**
 * Check the payload body for attributes, types and ids
 */
exports.subscription = function (req, res, next) {
  debug('subscription');

  function getSubIdPatterns(entityInfo) {
    const IdPatterns = [];

    entityInfo.forEach((entity) => {
      if (entity.idPattern) {
        IdPatterns.push(entity.idPattern);
      }
    });
    return _.isEmpty(IdPatterns) ? undefined : IdPatterns;
  }

  function getSubIds(entityInfo) {
    const ids = [];
    entityInfo.forEach((entity) => {
      if (entity.id) {
        ids.push(entity.id);
      }
    });
    return _.isEmpty(ids) ? undefined : ids;
  }

  function getSubAttrs(notificationAttrs, watchedAttrs) {
    let attrs = [];
    if (notificationAttrs) {
      attrs = _.union(attrs, notificationAttrs);
    }
    if (watchedAttrs) {
      attrs = _.union(attrs, watchedAttrs);
    }
    return _.isEmpty(attrs) ? undefined : attrs;
  }

  function getSubTypes(entityInfo) {
    const types = [];
    entityInfo.forEach((entity) => {
      if (entity.type) {
        types.push(entity.type);
      }
    });

    return _.isEmpty(types) ? undefined : types;
  }

  if (req.body) {
    const body = JSON.parse(req.body.toString());
    const entityInfo = body.entities || [];
    const notification = body.notification || {};

    res.locals.IdPatterns = getSubIdPatterns(entityInfo);
    res.locals.ids = getSubIds(entityInfo);
    res.locals.attrs = getSubAttrs(notification.attributes, body.watchedAttributes);
    res.locals.types = getSubTypes(entityInfo);
  }
  next();
};

/**
 * Check the payload body for attributes, types and ids
 */
exports.body = function (req, res, next) {
  debug('body');
  const ids = [];
  const attrs = [];
  const types = [];

  if (req.body) {
    getAttrs(JSON.parse(req.body.toString()), ids, types, attrs);
    res.locals.ids = _.uniq(ids);
    res.locals.attrs = _.uniq(attrs);
    res.locals.types = _.uniq(types);
  }
  next();
};

/**
 * Check the URL path for attributes and ids
 */
exports.params = function (req, res, next) {
  debug('params');
  if (req.params) {
    if (req.params.id) {
      res.locals.ids = res.locals.ids || [];
      if (!res.locals.ids.includes(req.params.id)) {
        res.locals.ids.push(req.params.id);
      }
    }

    if (req.params.attr) {
      res.locals.attr = res.locals.attr || [];
      if (!res.locals.attr.includes(req.params.attr)) {
        res.locals.ids.push(req.params.attr);
      }
    }
  }
  next();
};

/**
 * Check the query string for attributes, types and ids
 */
exports.query = function (req, res, next) {
  debug('query');
  if (req.query) {
    if (req.query.ids) {
      res.locals.ids = res.locals.ids || [];
      const ids = req.query.ids.split(',');
      ids.forEach((id) => {
        if (!res.locals.ids.includes(id)) {
          res.locals.ids.push(id);
        }
      });
    }

    if (req.query.type) {
      res.locals.types = res.locals.types || [];
      const types = req.query.type.split(',');
      types.forEach((type) => {
        if (!res.locals.types.includes(type)) {
          res.locals.types.push(type);
        }
      });
    }
  }
  next();
};
