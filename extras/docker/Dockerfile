ARG NODE_VERSION=14
ARG GITHUB_ACCOUNT=ging
ARG GITHUB_REPOSITORY=fiware-pep-proxy
ARG DOWNLOAD=latest
ARG SOURCE_BRANCH=master

# Default Builder, distro and distroless build version
ARG BUILDER=node:${NODE_VERSION}
ARG DISTRO=node:${NODE_VERSION}-slim
ARG DISTROLESS=gcr.io/distroless/nodejs:${NODE_VERSION}
ARG PACKAGE_MANAGER=apt
ARG USER=node

########################################################################################
#
# This build stage retrieves the source code from GitHub. The default download is the 
# latest tip of the master of the named repository on GitHub.
#
# To obtain the latest stable release run this Docker file with the parameters:
# --no-cache --build-arg DOWNLOAD=stable
#
# To obtain any specific version of a release run this Docker file with the parameters:
# --no-cache --build-arg DOWNLOAD=1.7.0
#
# For development purposes, to create a development image including a running Distro, 
# run this Docker file with the parameter:
#
# --target=builder
#
######################################################################################## 
FROM ${BUILDER} AS builder
ARG TARGET
ARG GITHUB_ACCOUNT
ARG GITHUB_REPOSITORY
ARG DOWNLOAD
ARG SOURCE_BRANCH
ARG PACKAGE_MANAGER

# hadolint ignore=DL3002
USER root
# Ensure that the chosen package manger is supported by this Dockerfile
# also ensure that unzip is installed prior to downloading sources

# hadolint ignore=SC2039
RUN \
	if [ "${PACKAGE_MANAGER}" = "apt"  ]; then \
		echo -e "\033[0;34mINFO: Using default \"${PACKAGE_MANAGER}\".\033[0m"; \
		apt-get install -y --no-install-recommends unzip; \
	elif [ "${PACKAGE_MANAGER}" = "yum"  ]; then \
		echo -e "\033[0;33mWARNING: Overriding default package manager. Using \"${PACKAGE_MANAGER}\" .\033[0m"; \
		yum install -y unzip; \
		yum clean all; \
	elif [ "${PACKAGE_MANAGER}" = "apk"  ]; then \
		echo -e "\033[0;33mWARNING: Overriding default package manager. Using \"${PACKAGE_MANAGER}\" .\033[0m"; \
		apk --no-cache --update-cache add gcc python3 python3-dev py-pip build-base wget curl; \
	else \
	 	echo -e "\033[0;31mERROR: Package Manager \"${PACKAGE_MANAGER}\" not supported.\033[0m"; \
	 	exit 1; \
	fi

# As an Alternative for local development, just copy this Dockerfile into file the root of 
# the repository and replace the whole RUN statement below by the following COPY statement 
# in your local source using :
#
# COPY . ${TARGET}/
#
RUN \
	if [ "${DOWNLOAD}" = "latest" ] ; \
	then \
		RELEASE="${SOURCE_BRANCH}"; \
		echo "INFO: Building Latest Development from ${SOURCE_BRANCH} branch."; \
	elif [ "${DOWNLOAD}" = "stable" ]; \
	then \
		RELEASE=$(curl -s https://api.github.com/repos/"${GITHUB_ACCOUNT}"/"${GITHUB_REPOSITORY}"/releases/latest | grep 'tag_name' | cut -d\" -f4); \
		echo "INFO: Building Latest Stable Release: ${RELEASE}"; \
	else \
	 	RELEASE="${DOWNLOAD}"; \
	 	echo "INFO: Building Release: ${RELEASE}"; \
	fi && \
	RELEASE_CONCAT=$(echo "${RELEASE}" | tr / -); \
	curl -s -L https://github.com/"${GITHUB_ACCOUNT}"/"${GITHUB_REPOSITORY}"/archive/"${RELEASE}".zip > source.zip && \
	unzip source.zip -x "*/.github/**" "*/test/**" "*/sanity/**" "*/extras/**" "*/signatures/**" "*/doc/**" "*/.*" && \
	rm source.zip && \
	mv "${GITHUB_REPOSITORY}-${RELEASE_CONCAT}" /opt/fiware-pep-proxy

WORKDIR /opt/fiware-pep-proxy

# hadolint ignore=DL3008
RUN \
	echo "INFO: npm install --production..." && \
	npm install --only=prod --no-package-lock --no-optional --unsafe-perm

########################################################################################
#
# This build stage creates an anonymous user to be used with the distroless build
# as defined below.
#
########################################################################################
FROM ${BUILDER} AS anon-user
# hadolint ignore=DL3002
USER root
RUN sed -i -r "/^(root|nobody)/!d" /etc/passwd /etc/shadow /etc/group \
    && sed -i -r 's#^(.*):[^:]*$#\1:/sbin/nologin#' /etc/passwd

########################################################################################
#
# This build stage creates a distroless image for production.
#
# IMPORTANT: For production environments use Docker Secrets to protect values of the 
# sensitive ENV variables defined below, by adding _FILE to the name of the relevant 
# variable.
#
# -  PEP_PROXY_USERNAME
# -  PEP_PROXY_ASSWORD
# -  PEP_PROXY_TOKEN_SECRET
#
########################################################################################

FROM ${DISTROLESS} AS distroless
ARG GITHUB_ACCOUNT
ARG GITHUB_REPOSITORY
ARG NODE_VERSION

LABEL "maintainer"="FIWARE Identity Manager Team. DIT-UPM"
LABEL "description"="Support for proxy functions within OAuth2-based authentication schemas. Also implements PEP functions within an XACML-based access control schema."
LABEL "name"="pep-proxy"
LABEL "summary"="PEP Proxy - Wilma (Distroless)"

LABEL "org.opencontainers.image.authors"=""
LABEL "org.opencontainers.image.documentation"="https://fiware-idm.readthedocs.io/"
LABEL "org.opencontainers.image.vendor"="Universidad Politécnica de Madrid."
LABEL "org.opencontainers.image.licenses"="MIT"
LABEL "org.opencontainers.image.title"="PEP Proxy - Wilma (Distroless)"
LABEL "org.opencontainers.image.description"="Support for proxy functions within OAuth2-based authentication schemas. Also implements PEP functions within an XACML-based access control schema."
LABEL "org.opencontainers.image.source"=https://github.com/${GITHUB_ACCOUNT}/${GITHUB_REPOSITORY}
LABEL "org.nodejs.version"=${NODE_VERSION}

COPY --from=builder /opt/fiware-pep-proxy /opt/fiware-pep-proxy
COPY --from=anon-user /etc/passwd /etc/shadow /etc/group /etc/
WORKDIR /opt/fiware-pep-proxy

USER nobody
ENV NODE_ENV=production
# Ports used by application
EXPOSE ${PEP_PROXY_PORT:-1027}
CMD ["./bin/www"]
HEALTHCHECK  --interval=30s --timeout=3s --start-period=60s \
  CMD ["/nodejs/bin/node", "./bin/healthcheck"]


########################################################################################
#
# This build stage creates a node-slim image for production.
#
# IMPORTANT: For production environments use Docker Secrets to protect values of the 
# sensitive ENV variables defined below, by adding _FILE to the name of the relevant 
# variable.
#
# -  PEP_PROXY_USERNAME
# -  PEP_PASSWORD
# -  PEP_TOKEN_SECRET
#
########################################################################################

FROM ${DISTRO} AS slim
ARG GITHUB_ACCOUNT
ARG GITHUB_REPOSITORY
ARG NODE_VERSION
ARG USER


LABEL "maintainer"="FIWARE Identity Manager Team. DIT-UPM"
LABEL "description"="Support for proxy functions within OAuth2-based authentication schemas. Also implements PEP functions within an XACML-based access control schema."
LABEL "name"="pep-proxy"
LABEL "summary"="PEP Proxy - Wilma"

LABEL "org.opencontainers.image.authors"=""
LABEL "org.opencontainers.image.documentation"="https://fiware-idm.readthedocs.io/"
LABEL "org.opencontainers.image.vendor"="Universidad Politécnica de Madrid."
LABEL "org.opencontainers.image.licenses"="MIT"
LABEL "org.opencontainers.image.title"="PEP Proxy - Wilma"
LABEL "org.opencontainers.image.description"="Support for proxy functions within OAuth2-based authentication schemas. Also implements PEP functions within an XACML-based access control schema."
LABEL "org.opencontainers.image.source"=https://github.com/${GITHUB_ACCOUNT}/${GITHUB_REPOSITORY}
LABEL "org.nodejs.version"=${NODE_VERSION}

COPY --from=builder /opt/fiware-pep-proxy /opt/fiware-pep-proxy
COPY --from=builder /opt/fiware-pep-proxy/LICENSE /licenses/LICENSE
WORKDIR /opt/fiware-pep-proxy

# Node by default, use 406 for Alpine, 1001 for UBI,
USER ${USER}
ENV NODE_ENV=production
# Ports used by application
EXPOSE ${PEP_PROXY_PORT:-1027}
CMD ["npm", "start"]
HEALTHCHECK  --interval=30s --timeout=3s --start-period=60s \
  CMD ["npm", "run", "healthcheck"]

# 
# ALL ENVIRONMENT VARIABLES
#
#    PEP_PROXY_PORT
#    PEP_PROXY_HTTPS_ENABLED
#    PEP_PROXY_HTTPS_PORT
#    PEP_PROXY_IDM_HOST
#    PEP_PROXY_IDM_PORT
#    PEP_PROXY_IDM_SSL_ENABLED
#    PEP_PROXY_APP_HOST
#    PEP_PROXY_APP_PORT
#    PEP_PROXY_APP_SSL_ENABLED
#    PEP_PROXY_ORG_ENABLED
#    PEP_PROXY_ORG_HEADER
#    PEP_PROXY_APP_ID
#    PEP_PROXY_USERNAME
#    PEP_PROXY_PASSWORD
#    PEP_PROXY_TOKEN_SECRET
#    PEP_PROXY_AUTH_ENABLED
#    PEP_PROXY_PDP
#    PEP_PROXY_TENANT_HEADER
#    PEP_PROXY_AZF_PROTOCOL
#    PEP_PROXY_AZF_HOST
#    PEP_PROXY_AZF_PORT
#    PEP_PROXY_AZF_CUSTOM_POLICY
#    PEP_PROXY_PUBLIC_PATHS
#    PEP_PROXY_AUTH_FOR_NGINX
#    PEP_PROXY_MAGIC_KEY
