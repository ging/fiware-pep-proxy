const log4js = require('log4js');

const configFile = require('../log_config.json');

log4js.configure(configFile);

exports.logger = log4js;

// How to use
/*
var log = require('./lib/logger').logger.getLogger("LoggerName");

log.info('');
log.debug('');
log.warn('');
log.error('');

*/
