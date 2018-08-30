FROM node:carbon-alpine

MAINTAINER FIWARE Wilma PEP Proxy Team. DIT-UPM

WORKDIR /opt

ENV PEP_PROXY_PORT "1027"

# Download latest version of the code and install npm dependencies
RUN apk add --no-cache git && \
	git clone https://github.com/ging/fiware-pep-proxy.git

# Copy config file
COPY config.js.template /opt/fiware-pep-proxy/config.js

# Run PEP Proxy
WORKDIR /opt/fiware-pep-proxy

RUN apk add --no-cache make gcc g++ python && \
  npm install --production --silent && \
  rm -rf /root/.npm/cache/* && \
  apk del make gcc g++ python

# Ports used by idm
EXPOSE ${PEP_PROXY_PORT} 

CMD ["npm", "start" ]
