# User and Programmers Guide

- [Introduction](#introduction)
- [User Guide](#user-guide)
    - [Basic Use Case](#basic-use-case)
- [Programmer Guide](#programmer-guide)
    - [Level 1: Authentication](#level-1-authentication)
    - [Level 2: Basic Authorization](#level-2-basic-authorization)
    - [Level 3: Advanced Authorization](#level-3-advanced-authorization)
        

## Introduction

Welcome to the User and Programmer Guide of the PEP Proxy GE. PEP Proxy provides a security layer for adding authentication and authorization filters to FIWARE GEs and any backend service. It is the PEP (Police Enforcement Point) of the FIWARE Security Chapter. So together with Identity Management and Authorization PDP GEs provides security to FIWARE backends.

**Note:** The PEP Proxy GE is a backend component, therefore for this GE there is no need to provide a user guide.

## User Guide

The PEP Proxy GE is a backend component, without frontend interface. Therefore there is no need to provide a user guide. Please, take into account that this component checks authentication and authorization of users in FIWARE applications. To create and manage users and applications and to configure roles and permissions for them, you have to use Identity Management GE web interface. Please, check its User Guide in order to know how to proceed.

### Basic Use Case

The basic use case is an scenario in which you have users of a front-end application that will access resources in a back-end application. And you want to allow only FIWARE users to access that resources. The steps to setup this environment are the following:

- Deploy a PEP Proxy on top of your back-end service. Now the endpoint of this service is the endpoint of the PEP Proxy and you have to change the back-end to other endpoint (may be in the same server but in other port). The PEP Proxy will redirect the requests to the service.
- Register you application in the IdM.
- With an OAuth2 library and the credentials obtained in the IdM for the application, implement an OAuth2 mechanism in your application. Thus, your users will be able to login in your application using their FIWARE accouts.
- When a user logs in in your application, IdM will generate an OAuth2 token that represents it. You have to save this OAuth2 token to include it in the requests to your back-end service (as an HTTP header).
- You have to send all the requests to your back-end service to the endpoint in which is deployed the PEP Proxy.
- If the token included in the request is valid, PEP Proxy will redirect the request to the back-end. If not it will respond with an unauthorized code.

## Programmer Guide

PEP Proxy GE is designed to perform three levels of security for the backend REST APIs. Requests to proxy should be made with a special HTTP Header: X-Auth-Token. This header contains the OAuth access token obtained from FIWARE IDM GE. Request example:

<pre>
GET / HTTP/1.1
Host: proxy_host
X-Auth-Token:z2zXk...ANOXvZrmvxvSg
</pre>

In order to validate the request and forward it to the backend application, PEP Proxy will check with Identity Management and Authorization PDP GEs different parameters depending on the security level that the administrator has configured. The available levels are:

- Level 1: Authentication PEP Proxy checks if the token included in the request corresponds to an authenticated user in FIWARE.
- Level 2: Basic Authorization PEP Proxy checks if the token included in the request corresponds to an authenticated user in FIWARE but also if the roles that the user has allow it to access the resource specified in the request. This is based in the HTTP verb and the path.
- Level 3: Advanced Authorization PEP Proxy checks if the token included in the request corresponds to an authenticated user in FIWARE but also other advanced parameters such us the body or the headers of the request.

Below are detailed these three levels and how to configure each one.

In order to be able to make these requests to Identity Management and Authorization PDP GEs, PEP Proxy needs to authenticate itself with Identity Management. The credentials are specified in *username* and *password* fields of the config file.

### Level 1: Authentication

When the frontend part of the application (Web App) sends a REST request to the backend part (Back-end App) it has to include the OAuth2 token (access_token) of the user. So the first step is to create a user and an application in FIWARE Account. Please, see the User Guide of Identity Management in order to know how to proceed.

<a name="def-fig1"></a>
![](https://raw.githubusercontent.com/ging/fiware-pep-proxy/master/doc/resources/Level_1-_Authentication.png)
<p align="center">Figure 1: Authentication</p>

[Figure 1](#def-fig1) shows the architecture of this configuration. When PEP Proxy receives the request, it extracts the access_token from the HTTP header (X-Auth-Token) and sends a request to FIWARE Account server (Identity Management GE) in order to validate it. The URL of the server is set in "account_host" field of the config file.

If the validation success, PEP Proxy will redirect the request to the backend service configured in "app_host" and "app_port" fields of the config file.

### Level 2: Basic Authorization

Again the first step is to create a user and an application in FIWARE Account. In this case you have also to configure the roles and permissions for that user in that application. Please, see the User Guide of Identity Management in order to know how to proceed.


<a name="def-fig2"></a>
![](https://raw.githubusercontent.com/ging/fiware-pep-proxy/master/doc/resources/Level_2-_Basic_Authorization.png)
<p align="center">Figure 2: Basic Authorization</p>


[Figure 2](#def-fig2) shows the architecture of this configuration. PEP Proxy checks if the access_token included in the request corresponds to an authenticated user in FIWARE Account. If the validation success the response includes the user information for that application. In this information is included the list of roles that the user has in the application. And PEP Proxy checks with Authorization PDP GE if the user has the permissions to access the resource of the request. This takes into account the HTTP verb and the path of the request.

In order to enable this Authorization level you have to set ?check_permissions? options to ?true? in config file and specify the Authorization PDP GE URL.

### Level 3: Advanced Authorization

The first step is to create a user and an application in FIWARE Account. Then configure the roles and XACML policies for that user in that application. Please, see the User Guide of Identity Management in order to know how to proceed.


<a name="def-fig3"></a>
![](https://raw.githubusercontent.com/ging/fiware-pep-proxy/master/doc/resources/Level_3-_Advanced_Authorization_.png)
<p align="center">Figure 3: Advanced Authorization</p>

[Figure 3](#def-fig3) shows the architecture of this configuration. As this case is thought to check advanced parameters of the request such us the body or custom headers, it depends on the specific use case. So the programmer should modify the PEP Proxy source code in order to include the specific requirements.

With the desired parameters he has to create a XACML <Request> and send a request to Authorization PDP GE in order to validate it. The request could be based in the one used in the previous configuration.