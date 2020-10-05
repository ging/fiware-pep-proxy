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

-   Node.js Server v0.8.17 or greater - [Download](http://nodejs.org/download/).
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

config.idm_host = "https://account.lab.fiware.org";

config.app.host = "www.google.es";
config.app.port = "80";

config.pep.app_id = "my_app_id";
config.pep.username = "pepProxy";
config.pep.password = "pepProxy";

config.check_permissions = false;

module.exports = config;
```

The username/password corresponds with the credentials of a registerd PEP Proxy in the FIWARE Account Portal. To do so,
you have to first register an application. The steps can be found
[here](https://fiware-idm.readthedocs.io/en/latest/user_and_programmers_guide/application_guide/index.html#register-pep-proxy-and-iot-agents).

You can also configure Pep Proxy to validate authorization in your application
([levels 2 and 3 of authorization](user_guide.md#level-2-basic-authorization)). If enabled PEP checks permissions in two
ways:

-   With [Keyrock Identity Manager](https://github.com/Fiware/catalogue/tree/master/security#keyrock): only allow basic
    authorization
-   With [Authzforce Authorization PDP](https://github.com/Fiware/catalogue/tree/master/security#authzforce): allow
    basic and advanced authorization. For advanced authorization, you can use custom policy checks by including
    programatic scripts in policies folder. An script template is included there.

```javascript
config.authorization = {
    enabled: false,
    pdp: "idm", // idm|authzforce
    azf: {
        protocol: "http",
        host: "localhost",
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
directive is a url of a backend-app.

To call a PEP Proxy, the various values of a request are defined in the `/_check_oauth2_token` block. The proxy_pass
directive is a url of a PEP Proxy.

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
