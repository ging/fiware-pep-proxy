# Installation and Administration Guide

- [Introduction](#introduction)
    - [Requirements](#requirements)
- [System Installation](#system-installation)
- [System Administration](#system-administration)
- [Sanity Check Procedures](#sanity-check-procedures)
    - [End to End testing](#end-to-end-testing)
    - [List of Running Processes](#list-of-running-processes)
    - [Network interfaces Up & Open](#network-interfaces-up--open)
    - [Databases](#databases)
- [Diagnosis Procedures](#diagnosis-procedures)
    - [Resource availability](#resource-availability)
    - [Remote Service Access](#remote-service-access)
    - [Resource consumption](#resource-consumption)
    - [I/O flows](#io-flows)

## Introduction

Welcome to the User and Programmer Guide of the PEP Proxy GE. PEP Proxy provides a security layer for adding authentication and authorization filters to FIWARE GEs and any backend service. It is the PEP (Police Enforcement Point) of the FIWARE Security Chapter. So together with Identity Management and Authorization PDP GEs provides security to FIWARE backends.

**Note:** The PEP Proxy GE is a backend component, therefore for this GE there is no need to provide a user guide.

### Requirements

In order to execute the PEP Proxy GE, it is needed to have previously installed the following software of framework:

 - Node.js Server v0.8.17 or greater (http://nodejs.org/download/).
 - Node Packaged Modules. It is usually included within Node.js (https://npmjs.org/).

## System Installation

The following steps need to be performed to get the PEP Proxy up and running:

- Download the software, using [GitHub](http://github.com/ging/fiware-pep-proxy).

<pre>
 git clone https://github.com/ging/fiware-pep-proxy
</pre>

- Install all required libraries using NPM.

<pre>
 cd fiware-pep-proxy
 npm install
</pre>

- Configure the installation

To configure PEP Proxy you can copy the file named config.js.template to config.js and edit it with the corresponding info. Below you can see an example:

<pre>
 var config = {};

 config.account_host = 'https://account.lab.fiware.org';

 config.keystone_host = 'cloud.lab.fiware.org';
 config.keystone_port = 4731;

 config.app_host = 'www.google.es';
 config.app_port = '80';

 config.username = 'pepProxy';
 config.password = 'pepProxy';

 config.check_permissions = false;

 module.exports = config;
</pre>

The username/password corresponds with the credentials of a registerd PEP Proxy in the FIWARE Account Portal. Do do so you have to first register an application. The steps can be found [here](http://fiware-idm.readthedocs.org/en/latest/user_guide.html#registering-an-application).

You can also configure the connection to an [Authorization PDP GE](http://catalogue.fiware.org/enablers/authorization-pdp-authzforce) instance to validate authorization in your application ([levels 2 and 3 of authorization](user_guide/#level-2-basic-authorization)):

<pre>
	config.azf = {
		enabled: true,
		protocol: 'http',
	    host: 'azf_host',
	    port: 6019,
	    custom_policy: undefined
	};
</pre>

- Launch the executable by running the next command with administrative permissions as it is going to be run on TCP Port 80:

<pre>
 node server.js
</pre>

- You can also install forever.js to run it in a production environment:

<pre>
 sudo npm install forever -g
</pre>

- And then run the server using forever:

<pre>
 forever start server.js
</pre>

- To know the status of the process you can run the next command:

<pre>
 forever status
</pre>

## System Administration

PEP Proxy GE do not need specific system administration.

## Sanity Check Procedures

The Sanity Check Procedures are the steps that a System Administrator will take to verify that an installation is ready to be tested. This is therefore a preliminary set of tests to ensure that obvious or basic malfunctioning is fixed before proceeding to unit tests, integration tests and user validation.

### End to End testing

Requests to proxy should be made with a special HTTP Header: X-Auth-Token. This header contains the OAuth access token obtained from FIWARE IDM GE.

Example of request:

<pre>
 GET / HTTP/1.1
 Host: proxy_host
 X-Auth-Token:z2zXk...ANOXvZrmvxvSg
</pre>

To test the proxy you can generate this request running the following command:

<pre>
 curl --header "X-Auth-Token:z2zXk...ANOXvZrmvxvSg" http://proxy_host
</pre>

Once authenticated, the forwarded request will include additional HTTP headers with user info:

<pre>
 X-Nick-Name: nickname of the user in IdM
 X-Display-Name: display name of user in IdM
 X-Roles: roles of the user in IdM
 X-Organizations: organizations in IdM
</pre>

### List of Running Processes

In case you are using forever to run the PEP Proxy the following command will allow the admin to see the process:

<pre>
 forever list 
</pre>

### Network interfaces Up & Open

- TCP port 80 should be accessible to the web browsers in order to load the access the PEP Proxy.
- Identity Management and Authorization PDP GEs should be accessible from PEP Proxy.

### Databases

PEP Proxy does not use traditional databases. It makes requests directly to other Generic Enablers.

## Diagnosis Procedures

The Diagnosis Procedures are the first steps that a System Administrator will take to locate the source of an error in a GE. Once the nature of the error is identified with these tests, the system admin will very often have to resort to more concrete and specific testing to pinpoint the exact point of error and a possible solution. Such specific testing is out of the scope of this section.

### Resource availability

- Verify that 2.5MB of disk space is left using the UNIX command 'df'

### Remote Service Access

Please make sure port 80 is accessible. All other GE's ports need to be accessible too.

### Resource consumption

PEP Proxy GE has very minimal resource constraints on the server since it does not have any database or complex application logic.

Typical memory consumption is 100MB and it consumes almost the 1% of a CPU core of 2GHz, but it depends on user demand. It also consumes TCP sockets and the amount of them increases depending again on the demand.

### I/O flows

Applications access the PEP Proxy through a REST API. This is simple HTTP traffic. PEP Proxy sends REST requests to Identity Management and Authorization PDP GEs.
