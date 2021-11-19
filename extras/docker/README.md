# How to use this Dockerfile

To run a Wima Docker container you have two options:

-   You can build your own image using the Dockerfile we provide and then run the container from it or
-   you can run the container directly from the image we provide in Docker Hub.

Both options require that you have [docker](https://docs.docker.com/installation/) installed on your machine.

## Build your own image and run the container from it

You have to download the [Wilma's code](https://github.com/ging/fiware-pep-proxy) from GitHub and navigate to
`extras/docker` directory. There, to compile your own image just run:

```console
sudo docker build -t pep-proxy-image .
```

> **Note** If you do not want to have to use `sudo` in this or in the next section follow
> [these instructions](https://docs.docker.com/installation/ubuntulinux/#create-a-docker-group).

This builds a new Docker image following the steps in `Dockerfile` and saves it in your local Docker repository with the
name `pep-proxy-image`. You can check the available images in your local repository using:

```console
sudo docker images
```

> **Note** If you want to know more about images and the building process you can find it in
> [Docker's documentation](https://docs.docker.com/userguide/dockerimages/).

Now you can run a new container from the image you have just created with:

```console
sudo docker run -d --name pep-proxy-container -v [host_config_file]:/opt/fiware-pep-proxy/config.js -p [host_port]:[container_port] pep-proxy-image
```

Where the different params mean:

-   -d indicates that the container runs as a daemon
-   --name is the name of the new container (you can use the name you want)
-   -v stablishes a relation between a local folder (in your host computer) and a container's folder. In this case it is
    used to pass to the container the configuration file that PEP Proxy needs to work. `host_config_file` has to be the
    location of a local file with that configuration following the
    [config template](https://github.com/ging/fiware-pep-proxy/blob/master/config.js.template).
-   -p stablishes a relation between a local port and a container's port. You can use the port you want in `host_port`
    but `container_port` has to be the same that you have set in `config.app_port` in your config file. If you have set
    `config.https` to `true` you have to use here the HTTPS port.
-   the last param is the name of the image

Here is an example of this command:

```console
sudo docker run -d --name pep-proxy -v /home/root/workspace/fiware-pep-proxy/config.js:/opt/fiware-pep-proxy/config.js -p 80:80 pep-proxy-image
```

Once the container is running you can view the console logs using:

```console
sudo docker logs -f pep-proxy
```

To stop the container:

```console
sudo docker stop pep-proxy
```

## Run the container from the last release in Docker Hub

You can also run the container from the [image we provide](https://hub.docker.com/r/fiware/pep-proxy/) in Docker Hub. In
this case you have only to execute the run command. But now the image name is fiware/pep-proxy:_version_ where `version`
is the release you want to use:

```console
sudo docker run -d --name pep-proxy-container -v [host_config_file]:/opt/fiware-pep-proxy/config.js -p [host_port]:[container_port] fiware/pep-proxy
```

> **Note** If you do not specify a version you are pulling from `latest` by default.

### Docker Environment Variables

-   `PEP_PROXY_PORT` - default value is `80`
-   `PEP_PROXY_HTTPS_ENABLED` - default value is `false`
-   `PEP_PROXY_HTTPS_PORT` - default value is `443`
-   `PEP_PROXY_IDM_HOST` - default value is `account.lab.fiware.org`
-   `PEP_PROXY_IDM_PORT` - default value is `443`
-   `PEP_PROXY_IDM_SSL_ENABLED` - default value is `true`
-   `PEP_PROXY_APP_HOST` - default value is `www.fiware.org'`
-   `PEP_PROXY_APP_PORT` - default value is `80`
-   `PEP_PROXY_APP_SSL_ENABLED` - default value is `false` - Use `true` if the app server listens in HTTPS
-   `PEP_PROXY_APP_ID` - default value is left blank and must be overridden
-   `PEP_PROXY_USERNAME` - default value is left blank and must be overridden
-   `PEP_PROXY_PASSWORD` - default value is left blank and must be overridden
-   `PEP_PROXY_AUTH_ENABLED` - default value is `false`
-   `PEP_PROXY_PDP` - default value is `idm` can be set to `authzforce`, `iShare` or `xacml`
-   `PEP_PROXY_PDP_PROTOCOL` - default value is `http`
-   `PEP_PROXY_PDP_HOST` - default value is `localhost`
-   `PEP_PROXY_PDP_PORT` - default value is `8080`
-   `PEP_PROXY_PDP_PATH` - default value is blank
-   `PEP_PROXY_TENANT_HEADER` - default value is left blank. Typically set to `NGSILD-Tenant` or `fiware-service`.
-   `PEP_PROXY_AZF_PROTOCOL` - _deprecated_ use `PEP_PROXY_PDP_PROTOCOL`
-   `PEP_PROXY_AZF_HOST` - _deprecated_ use `PEP_PROXY_PDP_HOST`
-   `PEP_PROXY_AZF_PORT` - _deprecated_ use `PEP_PROXY_PDP_PORT`
-   `PEP_PROXY_AZF_CUSTOM_POLICY` - default value is `undefined` which impliesthe usage of default policy checks (HTTP
    verb + path).
-   `PEP_PROXY_PUBLIC_PATHS` - default value is `[]` - Use `,` to split paths - example:
    `PEP_PROXY_PUBLIC_PATHS=/public/*,/static/css/`

-   `PEP_PROXY_CORS_ORIGIN` - default value is `*`
-   `PEP_PROXY_CORS_METHODS` - default value is `GET,HEAD,PUT,PATCH,POST,DELETE`
-   `PEP_PROXY_CORS_OPTIONS_SUCCESS_STATUS` - default value is `204`
-   `PEP_PROXY_CORS_ALLOWED_HEADERS` - all headers area allowed by default, set to a comma delimited list to restrict
    this.
-   `PEP_PROXY_CORS_CREDENTIALS` - The `Access-Control-Allow-Credentials`
-   `PEP_PROXY_CORS_MAX_AGE` - The `Access-Control-Max-Age` header is not sent by default. set to `true` to enable it.
-   `PEP_PROXY_MAGIC_KEY` - default value is `undefined` - should be overridden
-   `PEP_PROXY_AUTH_FOR_NGINX` - default value is `false`
-   `PEP_PROXY_ERROR_TEMPLATE` - default value is an NGSI error payload.
-   `PEP_PROXY_ERROR_CONTENT_TYPE` - default value is `application/json`
