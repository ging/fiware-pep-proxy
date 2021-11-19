# Installation and Administration Guide

-   [Introduction](#introduction)
    -   [Requirements](#requirements)
-   [System Installation](#system-installation)
    -   [Integration PEP Proxy with Nginx](#integration-pep-proxy-with-nginx)
-   [System Administration](#system-administration)
-   [Sanity Check Procedures](#sanity-check-procedures)
    -   [End-to-end testing](#end-to-end-testing)
    -   [List of Running Processes](#list-of-running-processes)
    -   [Network interfaces Up & Open](#network-interfaces-up--open)
    -   [Databases](#databases)
-   [Diagnosis Procedures](#diagnosis-procedures)
    -   [Resource availability](#resource-availability)
    -   [Remote Service Access](#remote-service-access)
    -   [Resource consumption](#resource-consumption)
    -   [I/O flows](#io-flows)

## Introduction

Welcome to the Installation and Administration Guide of the PEP Proxy GE. PEP Proxy provides a security layer for adding
authentication and authorization filters to FIWARE GEs and any backend service. It is the PEP (Police Enforcement Point)
of the FIWARE Security Chapter. So together with Identity Management and Authorization PDP GEs provides security to
FIWARE backends.

**Note:** The PEP Proxy GE is a backend component, therefore for this GE there is no need to provide a user guide.

### Requirements

In order to execute the PEP Proxy GE, it is needed to have previously installed the following software of framework:

-   Node.js Server 10 or greater - [Download](http://nodejs.org/download/).
-   Node Packaged Modules. It is usually included within [Node.js](https://www.npmjs.com/).

## System Installation

The following steps need to be performed to get the PEP Proxy up and running:

-   Download the software, using [GitHub](http://github.com/ging/fiware-pep-proxy).

```bash
 git clone https://github.com/ging/fiware-pep-proxy
```

-   Install all required libraries using npm.

```bash
 cd fiware-pep-proxy
 npm install
```

-   Configure the installation

To configure PEP Proxy you can copy the file named config.js.template to config.js and edit it with the corresponding
info. Below you can see an example:

```javascript
var config = {};

config.idm_host = 'https://account.lab.fiware.org';

config.app.host = 'www.google.es';
config.app.port = '80';

config.pep.app_id = 'my_app_id';
config.pep.username = 'pepProxy';
config.pep.password = 'pepProxy';

config.check_permissions = false;

module.exports = config;
```

The username/password corresponds with the credentials of a registerd PEP Proxy in the FIWARE Account Portal. To do so,
you have to first register an application. The steps can be found
[here](https://fiware-idm.readthedocs.io/en/latest/user_and_programmers_guide/application_guide/index.html#register-pep-proxy-and-iot-agents).

You can also configure Pep Proxy to validate authorization in your application
([levels 2 and 3 of authorization](user_guide.md#level-2-basic-authorization)). If enabled PEP checks permissions in
multiple ways:

-   With [Keyrock Identity Manager](https://github.com/Fiware/catalogue/tree/master/security#keyrock): only allow basic
    authorization
-   With [Keyrock Identity Manager](https://github.com/Fiware/catalogue/tree/master/security#keyrock): payload attribute
    level authorization requests in iShare format.
-   With [Keyrock Identity Manager](https://github.com/Fiware/catalogue/tree/master/security#keyrock): payload attribute
    level authorization requests in
    [XACML 3.0 JSON](https://docs.oasis-open.org/xacml/xacml-json-http/v1.0/xacml-json-http-v1.0.html) format.
-   With [Keyrock Identity Manager](https://github.com/Fiware/catalogue/tree/master/security#keyrock): payload attribute
    level authorization requests in [Open Policy Agent](https://www.openpolicyagent.org/) format.
-   With [Authzforce Authorization PDP](https://github.com/Fiware/catalogue/tree/master/security#authzforce): allow
    basic and advanced authorization. For advanced authorization, you can use custom policy checks by including
    programatic scripts in policies folder. An script template is included there.

The `config.authorization.header` can be passed to Keyrock IDM to reduce permissions to a single tenant and if used
should correspond to the tenant header (`NGSILD-Tenant` or `fiware-service`) when authorizing a multi-tenant system such
as FIWARE

```javascript
config.authorization = {
    enabled: false,
    pdp: 'idm', // idm|iShare|xacml|authzforce|opa
    header: undefined,
    azf: {
        protocol: 'http',
        host: 'localhost',
        port: 8080,
        custom_policy: undefined // use undefined to default policy checks (HTTP verb + path).
    }
};
```

This is only compatible with oauth2 tokens engine

-   Launch the executable by running the next command with administrative permissions as it is going to be run on TCP
    Port 80:

```bash
 npm start
```

-   You can also install forever.js to run it in a production environment:

```bash
 sudo npm install forever -g
```

-   And then run the server using forever:

```bash
 forever start server.js
```

-   To know the status of the process you can run the next command:

```bash
 forever status
```

### Integration PEP Proxy with Nginx

When deploying a PEP Proxy in a system where Nginx as a reverse proxy is in front of a backend-app, The PEP Proxy is put
between them. As a result, the system has multiple proxies.

To avoid multi-tiered proxies, you can use the auth_request module of Nginx to trigger an API call to the PEP Proxy
before proxying a request to a backend-app as shown:

<a name="def-fig1"></a> ![](./resources/Auth_for_nginx.png)

<p align="center">Figure 1: Integration PEP Proxy with Nginx</p>

When enabling `config.auth for nginx`, a PEP Proxy will respond with the HTTP status '204 No Content' to Nginx instead
of forwarding a request to a backend-app if the token included in the request is valid.

```
config.auth_for_nginx = true;
```

The following is an example of Nginx configuration.

```
server {
    listen 80;
    server_name example.org;

    location / {
        set $req_uri "$uri";
        auth_request /_check_oauth2_token;
        proxy_pass http://orion:1026;
    }

    location = /_check_oauth2_token {
        internal;
        proxy_method $request_method;
        proxy_pass_request_headers on;
        proxy_set_header Content-Length "";
        proxy_pass_request_body off;
        rewrite (.*) $req_uri break;
        proxy_pass http://wilma:1027;
    }
}
```

The auth_request directive in the `location /` block specifies the location for checking a token and permissions.
Proxying to a backend-app happens only if the auth_request response is successful (HTTP status 2xx). The proxy_pass
directive is a URL of a backend-app.

To call a PEP Proxy, the various values of a request are defined in the `/_check_oauth2_token` block. The proxy_pass
directive is a URL of a PEP Proxy.

Update the values of the two proxy_pass directives to suit your system environment.

## System Administration

PEP Proxy GE do not need specific system administration.

## Sanity Check Procedures

The Sanity Check Procedures are the steps that a System Administrator will take to verify that an installation is ready
to be tested. This is therefore a preliminary set of tests to ensure that obvious or basic malfunctioning is fixed
before proceeding to unit tests, integration tests and user validation.

### End-to-end testing

Requests to proxy should be made with a special HTTP Header: X-Auth-Token or with the standar header Authorization:
Bearer header. These headers contain the OAuth access token obtained from FIWARE IDM GE.

Example of requests:

```text
GET / HTTP/1.1
Host: proxy_host
Authorization: Bearer z2zXk...ANOXvZrmvxvSg
```

```text
GET / HTTP/1.1
Host: proxy_host
X-Auth-Token:z2zXk...ANOXvZrmvxvSg
```

To test the proxy you can generate this request running the following command:

```console
curl --header "X-Auth-Token: z2zXk...ANOXvZrmvxvSg" http://proxy_host
```

or

```console
curl --header "Authorization: Bearer z2zXk...ANOXvZrmvxvSg" http://proxy_host
```

Once authenticated, the forwarded request will include additional HTTP headers with user info:

```bash
 X-Nick-Name: nickname of the user in IdM
 X-Display-Name: display name of user in IdM
 X-Roles: roles of the user in IdM
 X-Organizations: organizations in IdM
```

### List of Running Processes

In case you are using forever to run the PEP Proxy the following command will allow the admin to see the process:

```bash
 forever list
```

### Network interfaces Up & Open

-   TCP port 80 should be accessible to the web browsers in order to load the access the PEP Proxy.
-   Identity Management and Authorization PDP GEs should be accessible from PEP Proxy.

### Databases

PEP Proxy does not use traditional databases. It makes requests directly to other Generic Enablers.

## Diagnosis Procedures

The Diagnosis Procedures are the first steps that a System Administrator will take to locate the source of an error in a
GE. Once the nature of the error is identified with these tests, the system admin will very often have to resort to more
concrete and specific testing to pinpoint the exact point of error and a possible solution. Such specific testing is out
of the scope of this section.

### Resource availability

-   Verify that 2.5MB of disk space is left using the UNIX command 'df'

### Remote Service Access

Please make sure port 80 is accessible. All other GE's ports need to be accessible too.

### Resource consumption

PEP Proxy GE has very minimal resource constraints on the server since it does not have any database or complex
application logic.

Typical memory consumption is 100MB and it consumes almost the 1% of a CPU core of 2GHz, but it depends on user demand.
It also consumes TCP sockets and the amount of them increases depending again on the demand.

### I/O flows

Applications access the PEP Proxy through a REST API. This is simple HTTP traffic. PEP Proxy sends REST requests to
Identity Management and Authorization PDP GEs.

## Configuration

The PEP Proxy starts up with configuration from the `config.js` file.

### Global Configuration

These are the parameters that can be configured in the global section:

-   **pep_port**: Port to use if HTTPS is disabled
-   **https**: HTTPS configuration. Disable or leave undefined if you are testing without an HTTPS certificate
-   **error_template**: A [Handlebars](https://handlebarsjs.com/) template defining the format of an error message
    payload
-   **error_content_type**: The content-type header of the error message

```json
{
    "enabled": false,
    "cert_file": "cert/cert.crt",
    "key_file": "cert/key.key",
    "port": 443,
    "error_template" : "{\"type\": \"{{type}}\", \"title\": \"{{title}}\", \"detail\": \"{{message}}\"}",
    "error_content_type" "application/json"
}
```

-   **idm**: Configuration of the identity manager that is linked to the PEP Proxy

```json
{
    "host": "localhost",
    "port": 3005,
    "ssl": false
}
```

-   **app**: Definition of the application that is being protected

```json
{
    "host": "www.fiware.org",
    "port": "80",
    "ssl": false // Use true if the app server listens in https
}
```

-   **organizations**: Organization used with the application

```json
{
    "enabled": false,
    "header": "fiware-service"
}
```

-   **pep**: configures all the information needed to register the PEP Proxy in the Identity Manager. A Secret must be
    configured in order validate a JWT.

```json
{
    "app_id": "",
    "username": "",
    "password": "",
    "token": {
        "secret": ""
    },
    "trusted_apps": []
}
```

-   **cache_time**: length of time in seconds to allow between verifications

-   **authorization**: if enabled PEP checks permissions in two ways:
    -   With IdM: only allow basic authorization
    -   With Authzforce: allow basic and advanced authorization.

For advanced authorization, you can use custom policy checks by including programatic scripts in policies folder. An
script template is included there. This functionality is only compatible with an oauth2 token engine. Set the
`custom_policy` to undefined use default policy checks (HTTP verb + path).

```json
{
    "enabled": false,
    "pdp": "idm", // idm|authzforce
    "azf": {
        "protocol": "http",
        "host": "localhost",
        "port": 8080,
        "custom_policy": undefined
    }
}
```

-   **corsOptions**: Configurs the defaults for Cross-Origin Resource Sharing (CORS).

```json
{
    "origin": "*",
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "preflightContinue": false,
    "optionsSuccessStatus": 204,
    "allowedHeaders": "content-type,X-Auth-Token,Tenant-ID,Authorization,Fiware-Service,Fiware-ServicePath,NGSILD-Tenant,NGSILD-Path",
    "credentials": true
}
```

-   **origin**: Configures the Access-Control-Allow-Origin CORS header. The default is to allow all traffic. Possible
    values:
    -   Boolean - set origin to `true` to reflect the request origin, as defined by `req.header('Origin')`, or set it to
        `false` to disable CORS.
    -   String - set origin to a specific origin. For example if you set it to `"http://example.com"` only requests from
        `"http://example.com"` will be allowed.
    -   RegExp - set origin to a regular expression pattern which will be used to test the request origin. If it's a
        match, the request origin will be reflected. For example the pattern `/example\.com$/` will reflect any request
        that is coming from an origin ending with `"example.com"`.
    -   Array - set origin to an array of valid origins. Each origin can be a String or a RegExp. For example
        `["http://example1.com", /\.example2\.com$/]` will accept any request from `"http://example1.com"` or from a
        subdomain of `"example2.com"`.
-   **methods**: Configures the `Access-Control-Allow-Methods CORS` header. Expects a comma-delimited string (ex:
    `'GET,PUT,POST'`) or an array (ex: `['GET', 'PUT', 'POST']`).
-   **allowedHeaders**: Configures the `Access-Control-Allow-Headers` CORS header. Expects a comma-delimited string (ex:
    `'Content-Type,Authorization')` or an array (ex: `['Content-Type', 'Authorization']`). If not specified, defaults to
    reflecting the headers specified in the request's `Access-Control-Request-Headers` header.
-   **exposedHeaders**: Configures the `Access-Control-Expose-Headers` CORS header. Expects a comma-delimited string
    (ex: `'Content-Range,X-Content-Range'`) or an array (ex: `['Content-Range', 'X-Content-Range']`). If not specified,
    no custom headers are exposed.
-   **credentials**: Configures the `Access-Control-Allow-Credentials` CORS header. Set to `true` to pass the header,
    otherwise it is omitted.
-   **maxAge**: Configures the `Access-Control-Max-Age` CORS header. Set to an integer to pass the header, otherwise it
    is omitted.
-   **optionsSuccessStatus**: Provides a status code to use for successful OPTIONS requests, since some legacy browsers.

For details on the effect of each CORS header, read [this article](https://web.dev/cross-origin-resource-sharing/) on
HTML5 Rocks.

-   **public_paths**: list of paths that will not be checked for authentication or authorization. For example:
    `['/public/*', '/static/css/']`
-   **magic_key**: A magic key for use within the PEP Proxy
-   **auth_for_nginx**: Boolean flag as to whether authentication for NGINX is enabled.

### Configuration using environment variables

Some of the configuration parameters can be overriden with environment variables, to ease the use of those parameters
with container-based technologies, like Docker, Heroku, etc...

The following table shows the accepted environment variables, as well as the configuration parameter the variable
overrides.

| Environment variable                  | Configuration attribute           | Notes                                       |     |
| :------------------------------------ | :-------------------------------- | ------------------------------------------- | --- |
| PEP_PROXY_PORT                        | `pep_port`                        |                                             |
| PEP_PROXY_HTTPS_ENABLED               | `https`                           |                                             |
| PEP_PROXY_HTTPS_PORT                  | `https.port`                      |                                             |
| PEP_PROXY_IDM_HOST                    | `idm.host`                        |                                             |
| PEP_PROXY_IDM_PORT                    | `idm.port`                        |                                             |
| PEP_PROXY_IDM_SSL_ENABLED             | `idm.ssl`                         |                                             |
| PEP_PROXY_APP_HOST                    | `app.host`                        |                                             |
| PEP_PROXY_APP_PORT                    | `app.port`                        |                                             |
| PEP_PROXY_APP_SSL_ENABLED             | `app.ssl`                         |                                             |
| PEP_PROXY_ORG_ENABLED                 | `organizations.enabled`           |                                             |
| PEP_PROXY_ORG_HEADER                  | `organizations.header`            |                                             |
| PEP_PROXY_APP_ID                      | `pep.app_id`                      |                                             |
| PEP_PROXY_USERNAME                    | `pep.username`                    |                                             |
| PEP_PROXY_PASSWORD                    | `pep.password`                    |                                             |
| PEP_PROXY_TOKEN_SECRET                | `pep.token`                       |                                             |
| PEP_PROXY_TRUSTED_APPS                | `pep.trusted_apps`                |                                             |
| PEP_PROXY_AUTH_ENABLED                | `authorization.enabled`           |                                             |
| PEP_PROXY_PDP                         | `authorization.pdp`               |                                             |
| PEP_PROXY_PDP_PROTOCOL                | `authorization.pdp.protocol`      |                                             |
| PEP_PROXY_PDP_HOST                    | `authorization.pdp.host`          |                                             |
| PEP_PROXY_PDP_PORT                    | `authorization.pdp.port`          |                                             |
| PEP_PROXY_PDP_PATH                    | `authorization.pdp.path`          |                                             |
| PEP_PROXY_TENANT_HEADER               | `authorization.header`            |                                             |
| PEP_PROXY_AZF_PROTOCOL                | `authorization.azf.protocol`      | **deprecated** use `PEP_PROXY_PDP_PROTOCOL` |
| PEP_PROXY_AZF_HOST                    | `authorization.azf.host`          | **deprecated** use `PEP_PROXY_PDP_HOST`     |
| PEP_PROXY_AZF_PORT                    | `authorization.azf.port`          | **deprecated** use `PEP_PROXY_PDP_PORT`     |
| PEP_PROXY_AZF_CUSTOM_POLICY           | `authorization.azf.custom_policy` |                                             |
| PEP_PROXY_PUBLIC_PATHS                | `public_path`                     |                                             |
| PEP_PROXY_CORS_ORIGIN                 | `cors.origin`                     |                                             |
| PEP_PROXY_CORS_METHODS                | `cors.methods`                    |                                             |
| PEP_PROXY_CORS_OPTIONS_SUCCESS_STATUS | `cors.optionsSuccessStatus`       |                                             |
| PEP_PROXY_CORS_ALLOWED_HEADERS        | `cors.allowedHeaders`             |                                             |
| PEP_PROXY_CORS_CREDENTIALS            | `cors.credentials`                |                                             |
| PEP_PROXY_CORS_MAX_AGE                | `cors.maxAge`                     |                                             |
| PEP_PROXY_AUTH_FOR_NGINX              | `config.auth_for_nginx`           |                                             |
| PEP_PROXY_MAGIC_KEY                   | `config.magic_key`                |
| PEP_PROXY_ERROR_TEMPLATE              | `config.error_template`           |

Note:

-   If you need to pass more than one variable in an array, you can define the environment variable as a comma separated
    list (e.g. `'http://example.com,http://test.com'`)
