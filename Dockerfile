ARG NODE_VERSION=10
ARG GITHUB_ACCOUNT=ging
ARG GITHUB_REPOSITORY=fiware-pep-proxy

########################################################################################
#
# This build stage retrieves the source code and sets up node-SAAS
#
######################################################################################## 

FROM node:${NODE_VERSION} as builder
COPY . /opt/fiware-pep-proxy
WORKDIR /opt/fiware-pep-proxy
RUN npm install --only=prod --no-package-lock --no-optional

########################################################################################
#
# This build stage creates an anonymous user to be used with the distroless build
# as defined below.
#
########################################################################################
FROM node:${NODE_VERSION} AS anon-user
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
# -  PEP_PASSWORD
# -  PEP_TOKEN_SECRET
#
########################################################################################

FROM gcr.io/distroless/nodejs:${NODE_VERSION}
ARG GITHUB_ACCOUNT
ARG GITHUB_REPOSITORY
ARG NODE_VERSION

LABEL "maintainer"="FIWARE Identity Manager Team. DIT-UPM"
LABEL "org.opencontainers.image.authors"=""
LABEL "org.opencontainers.image.documentation"="https://fiware-idm.readthedocs.io/"
LABEL "org.opencontainers.image.vendor"="Universidad Politécnica de Madrid."
LABEL "org.opencontainers.image.licenses"="MIT"
LABEL "org.opencontainers.image.title"="PEP Proxy - Wilma"
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
#    PEP_PASSWORD
#    PEP_TOKEN_SECRET
#    PEP_PROXY_AUTH_ENABLED
#    PEP_PROXY_PDP
#    PEP_PROXY_AZF_PROTOCOL
#    PEP_PROXY_AZF_HOST
#    PEP_PROXY_AZF_PORT
#    PEP_PROXY_AZF_CUSTOM_POLICY
#    PEP_PROXY_PUBLIC_PATHS
#    PEP_PROXY_CORS_ORIGIN
#    PEP_PROXY_CORS_METHODS
#    PEP_PROXY_CORS_OPTIONS_SUCCESS_STATUS
#    PEP_PROXY_CORS_ALLOWED_HEADERS
#    PEP_PROXY_CORS_CREDENTIALS
#    PEP_PROXY_CORS_MAX_AGE
#    PEP_PROXY_AUTH_FOR_NGINX
#    PEP_PROXY_MAGIC_KEY
