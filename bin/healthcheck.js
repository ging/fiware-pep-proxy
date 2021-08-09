#!/usr/bin/env node

/*
 * Copyright 2021 -  Universidad Politécnica de Madrid.
 *
 * This file is part of PEP-Proxy
 *
 */

const http = require('http');
const config = require('../config');
const http_code = process.env.HEALTHCHECK_CODE || 200;

function to_array(env, default_value) {
  return env !== undefined ? env.split(',') : default_value;
}

const public_paths = to_array(process.env.PEP_PROXY_PUBLIC_PATHS, ['/iot/about']);

const options = {
  host: 'localhost',
  port: process.env.PEP_PROXY_PORT || config.port,
  timeout: 2000,
  method: 'GET',
  path: public_paths[0] || '/'
};

const request = http.request(options, (result) => {
  // eslint-disable-next-line no-console
  console.info(`Performed health check, result ${result.statusCode}`);
  if (result.statusCode === http_code) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error(`An error occurred while performing health check, error: ${err}`);
  process.exit(1);
});

request.end();
