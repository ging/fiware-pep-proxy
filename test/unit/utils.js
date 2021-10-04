const jwt = require('jsonwebtoken');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createJWT(
  key = 'shhhhh',
  data = {
    app_id: 'application_id',
    trusted_apps: [],
    id: 'username',
    displayName: 'Some User'
  },
  expiry = undefined
) {
  return jwt.sign(data, key, expiry);
}

exports.sleep = sleep;
exports.createJWT = createJWT;
