fi-ware-pep-proxy
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

- Configure app host in config.js file. 

<pre>
config.app_host = 'www.google.es'; // Hostname to forward authenticated requests
config.app_port = '80';            // Port where the HTTP server is running
</pre>

- Start proxy server
- 
<pre>
sudo node server
</pre>

