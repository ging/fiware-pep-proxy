# PEP Proxy - Wilma


[![FIWARE Security](https://nexus.lab.fiware.org/repository/raw/public/badges/chapters/security.svg)](https://www.fiware.org/developers/catalogue/)
[![License: MIT](https://img.shields.io/github/license/ging/fiware-pep-proxy.svg)](https://opensource.org/licenses/MIT)
[![Documentation badge](https://img.shields.io/readthedocs/fiware-pep-proxy.svg)](http://fiware-pep-proxy.readthedocs.org/en/latest/)
[![Docker badge](https://img.shields.io/docker/pulls/fiware/pep-proxy.svg)](https://hub.docker.com/r/fiware/pep-proxy/)
[![Support badge](https://img.shields.io/badge/tag-fiware--wilma-orange.svg?logo=stackoverflow)](https://stackoverflow.com/questions/tagged/fiware-wilma)
![Status](https://nexus.lab.fiware.org/repository/raw/public/static/badges/statuses/wilma.svg)

* [Introduction](#introduction)
* [How to Build & Install](#how-to-build--install)
	+ [Docker](#docker)
* [API Overview](#api-overview)
* [Advanced Documentation](#advanced-documentation)
* [License](#license)

---



## Introduction

This project is part of [FIWARE](http://fiware.org). You will find more information about this FIWARE GE [here](https://catalogue-server.fiware.org/enablers/pep-proxy-wilma).

- You will find the source code of this project in GitHub [here](https://github.com/ging/fiware-pep-proxy)
- You will find the documentation of this project in Read the Docs [here](http://fiware-pep-proxy.readthedocs.org/)

Thanks to this component and together with Identity Management and Authorization PDP GEs, you will add authentication and authorization security to your backend applications. Thus, only FIWARE users will be able to access your GEs or REST services. But you will be able also to manage specific permissions and policies to your resources allowing different access levels to your users.


## How to Build & Install

- Software requirements:

	+ nodejs >= v0.10.37
	+ npm >= 1.3.6
	Note: Both can be installed from (http://nodejs.org/download/)

- Clone Proxy repository:

```console
git clone https://github.com/ging/fiware-pep-proxy.git
```

- Install the dependencies:

```console
cd fiware-pep-proxy/
npm install
```

- Duplicate config.template in config.js and configure app host there.

```
config.app_host = 'www.google.es'; // Hostname to forward authenticated requests
config.app_port = '80';            // Port where the HTTP server is running
```

- Start proxy server

```console
sudo node server
```

### Docker

We also provide a Docker image to facilitate you the building of this GE.

- [Here](https://github.com/ging/fiware-pep-proxy/tree/master/extras/docker) you will find the Dockerfile and the documentation explaining how to use it.
- In [Docker Hub](https://hub.docker.com/r/fiware/pep-proxy/) you will find the public image.

## API Overview

Requests to proxy should be made with a special HTTP Header: X-Auth-Token.
This header contains the OAuth access token obtained from FIWARE IDM GE.

Example of request:

```
GET / HTTP/1.1
Host: proxy_host
X-Auth-Token:z2zXk...ANOXvZrmvxvSg
```

To test the proxy you can generate this request running the following command:

```console
curl --header "X-Auth-Token:z2zXk...ANOXvZrmvxvSg" http://proxy_host
```

Once authenticated, the forwarded request will include additional HTTP headers with user info:

```
X-Nick-Name: nickname of the user in IdM
X-Display-Name: display name of user in IdM
X-Roles: roles of the user in IdM
X-Organizations: organizations in IdM
```

## Advanced Documentation

- [How to run tests](http://fiware-pep-proxy.readthedocs.org/en/latest/admin_guide#end-to-end-testing)
- [User & Programmers Manual](http://fiware-pep-proxy.readthedocs.org/en/latest/user_guide/)
- [Installation & Administration Guide](http://fiware-pep-proxy.readthedocs.org/en/latest/admin_guide/)

---

## License

[MIT](LICENSE) © 2018 Universidad Politécnica de Madrid.

