FROM node:carbon

MAINTAINER FIWARE Wilma PEP Proxy Team. DIT-UPM

WORKDIR /opt

ENV PEP_PROXY_PORT "1027"

# Download latest version of the code and install npm dependencies
RUN git clone https://github.com/ging/fiware-pep-proxy.git

# Copy config file
COPY config.js.template /opt/fiware-pep-proxy/config.js

# Run PEP Proxy
WORKDIR /opt/fiware-pep-proxy

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

# Ports used by idm
EXPOSE ${PEP_PROXY_PORT} 

CMD ["npm", "start" ]
