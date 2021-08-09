/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const config_service = require('./config_service');
const AZF = require('./pdp/azf');
const IDM = require('./pdp/idm');
const XACML = require('./pdp/xacml');
const iShare = require('./pdp/ishare');
const access = require('./access_functions');
const debug = require('debug')('pep-proxy:authorize');

function getRoles(user) {
  const roles = [];
  for (const orgIdx in user.organizations) {
    const org = user.organizations[orgIdx];
    for (const roleIdx in org.roles) {
      const role = org.roles[roleIdx];
      if (roles.indexOf(role.id) === -1) {
        roles.push(role.id);
      }
    }
  }

  for (const roleIdx in user.roles) {
    const role = user.roles[roleIdx];
    if (roles.indexOf(role) === -1) {
      roles.push(role.id);
    }
  }

  return roles;
}

function getData(req, res) {
  const user = req.user;
  const authorization = config_service.get_config().authorization;
  return {
    roles: getRoles(user),
    appId: user.app_id,
    azfDomain: user.app_azf_domain,
    action: req.method,
    resource: req.path,
    payload_ids: res.locals.ids,
    payload_attrs: res.locals.attrs,
    payload_types: res.locals.types,
    tenant_header: authorization.header ? req.get(authorization.header) : undefined
  };
}

const authorize = {
  idm: (req, res) => {
    access.adjudicate(req, res, IDM.checkPolicies(req.user));
  },

  xacml: (req, res) => {
    // Check decision through XACML Endpoint
    const authToken = req.app.get('pepToken');
    XACML.checkPolicies(authToken, getData(req, res))
      .then((decision) => {
        access.adjudicate(req, res, decision);
      })
      .catch((e) => {
        access.internalError(res, e, 'XACML');
      });
  },

  iShare: (req, res) => {
    // Check decision through iShare Endpoint
    const authToken = req.app.get('pepToken');
    iShare
      .checkPolicies(authToken, getData(req, res))
      .then((decision) => {
        access.adjudicate(req, res, decision);
      })
      .catch((e) => {
        access.internalError(res, e, 'iShare');
      });
  },
  authzforce: (req, res, authToken) => {
    // Check decision through authzforce
    AZF.checkPolicies(authToken, getData(req, res), req)
      .then((decision) => {
        access.adjudicate(req, res, decision);
      })
      .catch((e) => {
        if (e.status === 404) {
          debug('Domain not found: ', e);
          access.deny(res);
        } else {
          access.internalError(res, e, 'AZF');
        }
      });
  }
};

exports.checkPayload = function () {
  const authorization = config_service.get_config().authorization;
  return authorization.enabled && (authorization.pdp === 'iShare' || authorization.pdp === 'xacml');
};

exports.authorize = function (req, res, authToken) {
  return authorize[config_service.get_config().authorization.pdp](req, res, authToken);
};
