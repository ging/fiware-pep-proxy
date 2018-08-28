# PEP Proxy - Wilma


[![FIWARE Security](https://img.shields.io/badge/FIWARE-Security-ff7059.svg?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAVCAYAAAC33pUlAAAABHNCSVQICAgIfAhkiAAAA8NJREFUSEuVlUtIFlEUx+eO+j3Uz8wSLLJ3pBiBUljRu1WLCAKXbXpQEUFERSQF0aKVFAUVrSJalNXGgmphFEhQiZEIPQwKLbEUK7VvZrRvbr8zzjfNl4/swplz7rn/8z/33HtmRhn/MWzbXmloHVeG0a+VSmAXorXS+oehVD9+0zDN9mgk8n0sWtYnHo5tT9daH4BsM+THQC8naK02jCZ83/HlKaVSzBey1sm8BP9nnUpdjOfl/Qyzj5ust6cnO5FItJLoJqB6yJ4QuNcjVOohegpihshS4F6S7DTVVlNtFFxzNBa7kcaEwUGcbVnH8xOJD67WG9n1NILuKtOsQG9FngOc+lciic1iQ8uQGhJ1kVAKKXUs60RoQ5km93IfaREvuoFj7PZsy9rGXE9G/NhBsDOJ63Acp1J82eFU7OIVO1OxWGwpSU5hb0GqfMydMHYSdiMVnncNY5Vy3VbwRUEydvEaRxmAOSSqJMlJISTxS9YWTYLcg3B253xsPkc5lXk3XLlwrPLuDPKDqDIutzYaj3eweMkPeCCahO3+fEIF8SfLtg/5oI3Mh0ylKM4YRBaYzuBgPuRnBYD3mmhA1X5Aka8NKl4nNz7BaKTzSgsLCzWbvyo4eK9r15WwLKRAmmCXXDoA1kaG2F4jWFbgkxUnlcrB/xj5iHxFPiBN4JekY4nZ6ccOiQ87hgwhe+TOdogT1nfpgEDTvYAucIwHxBfNyhpGrR+F8x00WD33VCNTOr/Wd+9C51Ben7S0ZJUq3qZJ2OkZz+cL87ZfWuePlwRcHZjeUMxFwTrJZAJfSvyWZc1VgORTY8rBcubetdiOk+CO+jPOcCRTF+oZ0okUIyuQeSNL/lPrulg8flhmJHmE2gBpE9xrJNkwpN4rQIIyujGoELCQz8ggG38iGzjKkXufJ2Klun1iu65bnJub2yut3xbEK3UvsDEInCmvA6YjMeE1bCn8F9JBe1eAnS2JksmkIlEDfi8R46kkEkMWdqOv+AvS9rcp2bvk8OAESvgox7h4aWNMLd32jSMLvuwDAwORSE7Oe3ZRKrFwvYGrPOBJ2nZ20Op/mqKNzgraOTPt6Bnx5citUINIczX/jUw3xGL2+ia8KAvsvp0ePoL5hXkXO5YvQYSFAiqcJX8E/gyX8QUvv8eh9XUq3h7mE9tLJoNKqnhHXmCO+dtJ4ybSkH1jc9XRaHTMz1tATBe2UEkeAdKu/zWIkUbZxD+veLxEQhhUFmbnvOezsJrk+zmqMo6vIL2OXzPvQ8v7dgtpoQnkF/LP8Ruu9zXdJHg4igAAAABJRU5ErkJgggA=)](https://www.fiware.org/developers/catalogue/)
[![License: MIT](https://img.shields.io/github/license/ging/fiware-pep-proxy.svg)](https://opensource.org/licenses/MIT)
[![Documentation badge](https://img.shields.io/readthedocs/fiware-pep-proxy.svg)](http://fiware-pep-proxy.readthedocs.org/en/latest/)
[![Docker badge](https://img.shields.io/docker/pulls/fiware/pep-proxy.svg)](https://hub.docker.com/r/fiware/pep-proxy/)
[![Support badge](https://img.shields.io/badge/support-sof-yellowgreen.svg)](http://stackoverflow.com/questions/tagged/fiware-wilma)

* [Introduction](#introduction)
* [How to Build & Install](#how-to-build--install)
	+ [Docker](#docker)
* [API Overview](#api-overview)
* [Advanced Documentation](#advanced-documentation)
* [License](#license)

---



## Introduction

This project is part of [FIWARE](http://fiware.org). You will find more information about this FIWARE GE [here](http://catalogue.fiware.org/enablers/pep-proxy-wilma).

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

