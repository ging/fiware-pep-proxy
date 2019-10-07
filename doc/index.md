# PEP Proxy - Wilma

[![FIWARE Security](https://nexus.lab.fiware.org/static/badges/chapters/security.svg)](https://www.fiware.org/developers/catalogue/)
[![Support badge](https://img.shields.io/badge/tag-fiware--wilma-orange.svg?logo=stackoverflow)](https://stackoverflow.com/questions/tagged/fiware-wilma)

Wilma is a PEP Proxy - it can be combined with other security components such as
[Keyrock](https://github.com/ging/fiware-idm) and [Authzforce](https://github.com/authzforce/server) to enforce access
control to your backend applications. This means that only permitted users will be able to access your Generic Enablers
or REST services. Identity Management allows you to manage specific permissions and policies to resources allowing
different access levels for your users.

This project is part of [FIWARE](https://www.fiware.org/). For more information check the FIWARE Catalogue entry for
[Security](https://github.com/Fiware/catalogue/tree/master/security).

## Content

<span/>

-   [Install](#how-to-build--install)
    -   [Docker](#docker)
-   [API](#api-overview)
-   [Tests](#tests)
-   [Advanced Documentation](#advanced-documentation)
-   [Quality Assurance](#quality-assurance)
-   [License](#license)

## Install

-   Software requirements:

    -   nodejs >= v8.x.x
    -   npm >= 5.x.x

Note: Both can be installed from [Node.js](http://nodejs.org/download/)

-   Clone Proxy repository:

```bash
git clone https://github.com/ging/fiware-pep-proxy.git
```

-   Install the dependencies:

```bash
cd fiware-pep-proxy/
npm install
```

-   Duplicate config.template in `config.js` and configure app host there.

```javascript
config.app_host = "www.google.es"; // Hostname to forward authenticated requests
config.app_port = "80"; // Port where the HTTP server is running
```

-   Start proxy server

```bash
sudo node server
```

### Docker

We also provide a Docker image and two version of the `Dockerfile` to facilitate you building this GE.

-   [Here](https://github.com/ging/fiware-pep-proxy/tree/master/extras/docker) you will find the `Dockerfile` used in
    the automated build and the documentation explaining how to use it.
-   In [Docker Hub](https://hub.docker.com/r/fiware/pep-proxy/) you will find the public image.

A hacker's `Dockerfile-sample` file is also available in the root of the GitHub repository which can be used to build
Docker images against a local codebase - It can be modified to suit your needs and allows you to create local images
based on your own codebase if you want to make changes by yourself.

## API

Requests to proxy should be made with a special `HTTP Header: X-Auth-Token`. This header contains the OAuth access token
obtained from FIWARE IDM GE.

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

## Tests

For performing a basic end-to-end test, you have to follow the next steps. A detailed description about how to run tests
can be found [here](https://fiware-pep-proxy.readthedocs.io/en/latest/admin_guide#end-to-end-testing).

Requests to proxy should be made with a special HTTP Header: X-Auth-Token. This header contains the OAuth access token
obtained from FIWARE IDM GE.

Example of request:

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
