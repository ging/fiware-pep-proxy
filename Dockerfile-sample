ARG  NODE_VERSION=8.12.0-slim
FROM node:${NODE_VERSION}

# A "Hacker" Docker file for local usage.
# This will retrieve all the source code directly from local source

# Create app directory
WORKDIR /opt/fiware-pep-proxy

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY ./package*.json ./

RUN apt-get update && \
  apt-get install -y  --no-install-recommends make gcc g++ python && \
  npm install --production --silent && \
  rm -rf /root/.npm/cache/* && \
  apt-get clean && \
  apt-get remove -y make gcc g++ python  && \
  apt-get -y autoremove

# Bundle app source
COPY ./ .

# Copy over a config template file - the default ARG exposes ENV variables for each paramter
# Replace with config.js.template for a simple hard-coded JavaScript configuration file
ARG  CONFIG_TEMPLATE=extras/docker/config.js.template
COPY ${CONFIG_TEMPLATE} config.js


# Ports used by idm
EXPOSE ${PEP_PROXY_PORT:-1027}

CMD ["npm", "start" ]