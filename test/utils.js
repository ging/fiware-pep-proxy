const fs = require('fs');

function readExampleFile(name, raw) {
  const text = fs.readFileSync(name, 'UTF8');

  if (raw) {
    return text;
  }
  return JSON.parse(text);
}

function delay(ms) {
  return function(callback) {
    setTimeout(callback, ms);
  };
}

exports.readExampleFile = readExampleFile;
exports.delay = delay;
