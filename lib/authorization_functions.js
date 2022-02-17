/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const config_service = require('./config_service');
const AZF = require('./pdp/authzforce');
const OPA = require('./pdp/openPolicyAgent');
const IDM = require('./pdp/keyrock');
const XACML = require('./pdp/xacml');
const ISHARE = require('./pdp/iShare');
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
    payloadEntityIds: res.locals.ids,
    payloadIdPatterns: res.locals.IdPatterns,
    payloadAttrs: res.locals.attrs,
    payloadTypes: res.locals.types,
    tenant_header: authorization.header ? req.get(authorization.header) : undefined
  };
}

function idmAuthorize(req, res) {
  const decision = IDM.checkPolicies(req.user);
  access.adjudicate(req, res, decision);
}
function xacmlAuthorize(req, res) {
  // Check decision through XACML Endpoint
  const authToken = req.app.get('pepToken');
  XACML.checkPolicies(authToken, getData(req, res))
    .then((decision) => {
      access.adjudicate(req, res, decision);
    })
    .catch((e) => {
      access.internalError(res, e, 'XACML');
    });
}

function openPolicyAgentAuthorize(req, res) {
  // Check decision through Open Policy Agent Endpoint
  const authToken = req.app.get('pepToken');
  OPA.checkPolicies(authToken, getData(req, res))
    .then((decision) => {
      access.adjudicate(req, res, decision);
    })
    .catch((e) => {
      access.internalError(res, e, 'Open Policy Agent');
    });
}

function iShareAuthorize(req, res) {
  // Check decision through iShare Endpoint
  const user = req.user || {};
  const authToken = req.app.get('pepToken');
  const decision = ISHARE.checkPolicies(
    authToken,
    getData(req, res),
    user.delegationEvidence,
    user.authorzationRegistry
  );
  access.adjudicate(req, res, decision);
}
function authzforceAuthorize(req, res, authToken) {
  // Check decision through authzforce
  AZF.checkPolicies(authToken, getData(req, res), req)
    .then((decision) => {
      access.adjudicate(req, res, decision);
    })
    .catch((e) => {
      if (e.status === 404) {
        debug('Domain not found: ', e);
        access.deny(res, 'Domain not Found', 'urn:dx:as:UnauthorizedEndpoint');
      } else {
        access.internalError(res, e, 'Authzforce');
      }
    });
}

const authorize = {
  idm: idmAuthorize,
  xacml: xacmlAuthorize,
  ishare: iShareAuthorize,
  opa: openPolicyAgentAuthorize,
  azf: authzforceAuthorize
};

const payload_enabled = {
  azf: AZF.payload_enabled,
  idm: IDM.payload_enabled,
  xacml: XACML.payload_enabled,
  ishare: ISHARE.payload_enabled,
  opa: OPA.payload_enabled
};

const jwt_enabled = {
  azf: AZF.jwt_enabled,
  idm: IDM.jwt_enabled,
  xacml: XACML.jwt_enabled,
  ishare: ISHARE.jwt_enabled,
  opa: OPA.jwt_enabled
};

/**
 * Can the PDP check payloads?
 */
exports.checkPayload = function () {
  const authorization = config_service.get_config().authorization;
  return payload_enabled[authorization.pdp];
};

/**
 * Can the PDP validate from a JWT?
 */
exports.validateJWT = function () {
  const authorization = config_service.get_config().authorization;
  return jwt_enabled[authorization.pdp];
};

exports.authorize = function (req, res, authToken) {
  return authorize[config_service.get_config().authorization.pdp](req, res, authToken);
};
