var log4js = require('log4js');

var config_file = require('../log_config.json');

log4js.configure(config_file);

exports.logger = log4js;

// How to use
/*
var log = require('./lib/logger').logger.getLogger("LoggerName");

log.info('');
log.debug('');
log.warn('');
log.error('');

*/
