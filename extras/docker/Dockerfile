FROM node:8.12.0-slim
# Automated Docker file for Docker Hub
# This will retrieve the source code of the latest tagged release from GitHub

MAINTAINER FIWARE Wilma PEP Proxy Team. DIT-UPM

WORKDIR /opt

ARG OWNER
ENV OWNER ${OWNER:-ging}
ARG REPOSITORY
ENV REPOSITORY ${REPOSITORY:-fiware-pep-proxy}

WORKDIR /

RUN RELEASE=$(curl -s https://api.github.com/repos/${OWNER}/${REPOSITORY}/releases/latest | grep 'tag_name' | cut -d\" -f4) && \
  	echo "${RELEASE}"  && \
  	apt-get update && \
  	apt-get install -y  --no-install-recommends unzip && \
  	curl https://github.com/"${OWNER}"/"${REPOSITORY}"/archive/"${RELEASE}".zip -L -s -o source.zip  && \
  	unzip source.zip && \
	rm source.zip && \
	mv "${REPOSITORY}"-"${RELEASE}" /opt/fiware-pep-proxy && \
	rm -rf "${REPOSITORY}"-"${RELEASE}" && \
	apt-get clean && \
	apt-get remove -y unzip && \
    apt-get -y autoremove


# Copy config file from the same Directory.
COPY config.js.template /opt/fiware-pep-proxy/config.js

# Run PEP Proxy
WORKDIR /opt/fiware-pep-proxy

RUN apt-get install -y  --no-install-recommends make gcc g++ python && \
	npm install --production --silent && \
	rm -rf /root/.npm/cache/* && \
	apt-get clean && \
	apt-get remove -y make gcc g++ python  && \
	apt-get -y autoremove

# Ports used by idm
EXPOSE ${PEP_PROXY_PORT:-1027}

CMD ["npm", "start" ]
