Installation
===================

PEP oauth2 authentication proxy for FI-ware GE services

- Software requirements:

	+ nodejs 
	+ npm
	Note: Both can be installed from (http://nodejs.org/download/)

- Clone Proxy repository:

<pre>
git clone https://github.com/ging/fi-ware-pep-proxy.git
</pre>

- Install the dependencies:

<pre>
cd fi-ware-pep-proxy/
npm install
</pre>

- Duplicate config.template in config.js and configure app host there. 

<pre>
config.app_host = 'www.google.es'; // Hostname to forward authenticated requests
config.app_port = '80';            // Port where the HTTP server is running
</pre>

- Start proxy server

<pre>
sudo node server
</pre>

How to use
===================

Requests to proxy should be made with a special HTTP Header: X-Auth-Token. 
This header contains the OAuth access token obtained from FI-WARE IDM GE.

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
X-Nick-Name: nickname of user in IDM
X-Display-Name: display name in IDM
</pre>
