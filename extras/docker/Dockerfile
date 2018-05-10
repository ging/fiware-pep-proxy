FROM ubuntu:16.04

MAINTAINER FIWARE Wilma PEP Proxy Team. DIT-UPM

WORKDIR /opt

# Install Ubuntu dependencies
RUN apt-get update && \
    apt-get install build-essential ca-certificates curl git software-properties-common python-software-properties -y --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install PPA
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Download latest version of the code and install npm dependencies
RUN git clone https://github.com/ging/fiware-pep-proxy.git && \
    cd fiware-pep-proxy && \
    git checkout tags/7.0.0 && \
    npm install

# Run PEP Proxy
WORKDIR /opt/fiware-pep-proxy
CMD ["node", "server.js"]
