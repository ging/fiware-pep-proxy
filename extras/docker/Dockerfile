FROM ubuntu:14.04

MAINTAINER FIWARE Wilma PEP Proxy Team. DIT-UPM

WORKDIR /opt

# Install Ubuntu dependencies
RUN sudo apt-get update && \
	sudo apt-get install make g++ software-properties-common python-software-properties -y && \
	sudo add-apt-repository ppa:chris-lea/node.js -y && \
	sudo apt-get update && \
	sudo apt-get install nodejs git -y

# Download latest version of the code and install npm dependencies
RUN git clone https://github.com/ging/fiware-pep-proxy.git && \
	cd fiware-pep-proxy && \
	git checkout tags/5.4 && \
	npm install

# Run PEP Proxy
WORKDIR /opt/fiware-pep-proxy
CMD ["sudo", "node", "server.js"]
