/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const _ = require('underscore');
const debug = require('debug')('pep-proxy:payload');

/**
 * Check the payload body for attributes, types and ids
 */
exports.bodyAnalyse = function (req, res, next) {
  debug('bodyAnalyse');
  let prefix = '';

  const ids = [];
  const attrs = [];
  const types = [];

  function getAttrs(obj) {
    if (Array.isArray(obj)) {
      obj.forEach((element) => {
        getAttrs(element);
      });
    } else {
      const keys = _.without(_.keys(obj), 'value', 'type', 'id', 'observedAt', 'metadata', 'unitCode');

      keys.forEach((key) => {
        if (Array.isArray(obj[key])) {
          prefix = key + '.';
          getAttrs(obj[key]);
        } else {
          attrs.push(prefix + key);
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
  if (req.body) {
    getAttrs(JSON.parse(req.body.toString()));
    res.locals.ids = _.uniq(ids);
    res.locals.attrs = _.uniq(attrs);
    res.locals.types = _.uniq(types);
  }
  next();
};

/**
 * Check the URL path for attributes and ids
 */
exports.paramsAnalyse = function (req, res, next) {
  debug('paramsAnalyse');
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
exports.queryAnalyse = function (req, res, next) {
  debug('queryAnalyse');
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
