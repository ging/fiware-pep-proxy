# PEP Proxy - Wilma

[![FIWARE Security](https://nexus.lab.fiware.org/static/badges/chapters/security.svg)](https://www.fiware.org/developers/catalogue/)
[![License: MIT](https://img.shields.io/github/license/ging/fiware-pep-proxy.svg)](https://opensource.org/licenses/MIT)

[![Docker badge](https://img.shields.io/docker/pulls/fiware/pep-proxy.svg)](https://hub.docker.com/r/fiware/pep-proxy/)
[![Support badge](https://img.shields.io/badge/tag-fiware--wilma-orange.svg?logo=stackoverflow)](https://stackoverflow.com/questions/tagged/fiware-wilma)
<br>
[![Documentation badge](https://img.shields.io/readthedocs/fiware-pep-proxy.svg)](http://fiware-pep-proxy.readthedocs.org/en/latest/)
[![Build Status](https://travis-ci.org/ging/fiware-pep-proxy.svg?branch=master)](https://travis-ci.org/ging/fiware-pep-proxy)
![Status](https://nexus.lab.fiware.org/repository/raw/public/static/badges/statuses/wilma.svg)

Wilma is a PEP Proxy - it can be combined with other security components such
such as [Keyrock](https://github.com/ging/fiware-idm) and
[Authzforce](https://github.com/authzforce/server) to enforce access control to
your backend applications. This means that only permitted users will be able to
access your Generic Enablers or REST services. Identity Management allows you to
manage specific permissions and policies to resources allowing different access
levels for your users.

This project is part of [FIWARE](https://www.fiware.org/). For more information
check the FIWARE Catalogue entry for
[Security](https://github.com/Fiware/catalogue/tree/master/security).

## Content

-   [Install](#how-to-build--install)
    -   [Docker](#docker)
-   [API](#api-overview)
-   [Advanced Documentation](#advanced-documentation)
-   [Quality Assurance](#quality-assurance)
-   [License](#license)

## Install

-   Software requirements:

    -   nodejs >= v0.10.37
    -   npm >= 1.3.6

Note: Both can be installed from (http://nodejs.org/download/)

-   Clone Proxy repository:

```console
git clone https://github.com/ging/fiware-pep-proxy.git
```

-   Install the dependencies:

```console
cd fiware-pep-proxy/
npm install
```

-   Duplicate config.template in `config.js` and configure app host there.

```javascript
config.app_host = "www.google.es"; // Hostname to forward authenticated requests
config.app_port = "80"; // Port where the HTTP server is running
```

-   Start proxy server

```console
sudo node server
```

### Docker

We also provide a Docker image to facilitate you the building of this GE.

-   [Here](https://github.com/ging/fiware-pep-proxy/tree/master/extras/docker)
    you will find the Dockerfile and the documentation explaining how to use it.
-   In [Docker Hub](https://hub.docker.com/r/fiware/pep-proxy/) you will find
    the public image.

## API

Requests to proxy should be made with a special `HTTP Header: X-Auth-Token`. This
header contains the OAuth access token obtained from FIWARE IDM GE.

Example of request:

```bash
GET / HTTP/1.1
Host: proxy_host
X-Auth-Token:z2zXk...ANOXvZrmvxvSg
```

To test the proxy you can generate this request running the following command:

```console
curl --header "X-Auth-Token:z2zXk...ANOXvZrmvxvSg" http://proxy_host
```

Once authenticated, the forwarded request will include additional HTTP headers
with user info:

```bash
X-Nick-Name: nickname of the user in IdM
X-Display-Name: display name of user in IdM
X-Roles: roles of the user in IdM
X-Organizations: organizations in IdM
```

## Advanced Documentation

-   [How to run tests](http://fiware-pep-proxy.readthedocs.org/en/latest/admin_guide#end-to-end-testing)
-   [User & Programmers Manual](http://fiware-pep-proxy.readthedocs.org/en/latest/user_guide/)
-   [Installation & Administration Guide](http://fiware-pep-proxy.readthedocs.org/en/latest/admin_guide/)

## Quality Assurance

This project is part of [FIWARE](https://fiware.org/) and has been rated as
follows:

-   **Version Tested:**
    ![ ](https://img.shields.io/badge/dynamic/json.svg?label=Version&url=https://fiware.github.io/catalogue/json/wilma.json&query=$.version&colorB=blue)
-   **Documentation:**
    ![ ](https://img.shields.io/badge/dynamic/json.svg?label=Completeness&url=https://fiware.github.io/catalogue/json/wilma.json&query=$.docCompleteness&colorB=blue)
    ![ ](https://img.shields.io/badge/dynamic/json.svg?label=Usability&url=https://fiware.github.io/catalogue/json/wilma.json&query=$.docSoundness&colorB=blue)
-   **Responsiveness:**
    ![ ](https://img.shields.io/badge/dynamic/json.svg?label=Time%20to%20Respond&url=https://fiware.github.io/catalogue/json/wilma.json&query=$.timeToCharge&colorB=blue)
    ![ ](https://img.shields.io/badge/dynamic/json.svg?label=Time%20to%20Fix&url=https://fiware.github.io/catalogue/json/wilma.json&query=$.timeToFix&colorB=blue)
-   **FIWARE Testing:**
    ![ ](https://img.shields.io/badge/dynamic/json.svg?label=Tests%20Passed&url=https://fiware.github.io/catalogue/json/wilma.json&query=$.failureRate&colorB=blue)
    ![ ](https://img.shields.io/badge/dynamic/json.svg?label=Scalability&url=https://fiware.github.io/catalogue/json/wilma.json&query=$.scalability&colorB=blue)
    ![ ](https://img.shields.io/badge/dynamic/json.svg?label=Performance&url=https://fiware.github.io/catalogue/json/wilma.json&query=$.performance&colorB=blue)
    ![ ](https://img.shields.io/badge/dynamic/json.svg?label=Stability&url=https://fiware.github.io/catalogue/json/wilma.json&query=$.stability&colorB=blue)

---

## License

Wilma PEP Proxy is licensed under the [MIT](LICENSE) License.

© 2018 Universidad Politécnica de Madrid.
