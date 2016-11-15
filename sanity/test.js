var should = require('should');
var mocha = require('mocha'); 

var config = require('./../config'),
    IDM = require("./../lib/idm.js").IDM,
    AZF = require('./../lib/azf.js').AZF;

var log = require('./../lib/logger').logger.getLogger("Test");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

describe('Sanity Checks for Wilma PEP Proxy - Identity Manager Checks', function() {

    describe('Testing Keystone configuration', function() {

		it('should have Keystone configured', function (done) {
			if (config.keystone_host !== undefined && config.keystone_host !== '') {
				if (config.keystone_port !== undefined && config.keystone_port !== '') {
					done();
				}
			}
		});

		it('should have PEP user configured', function (done) {
			if (config.username !== undefined && config.username !== '') {
				if (config.password !== undefined && config.password !== '') {
					done();
				}
			}
		});
	});

    describe('Testing connection with Keystone', function() {

    	it('should have connectivity with Keystone', function (done) {
			IDM.check_conn (function (status) {
				if (status === 200) {
			    	done();	
				};
			}, function (status, e) {
			    log.error('Error in keystone communication', e);
			});
		});

		it('should authenticate with Keystone', function (done) {
			IDM.authenticate (function (token) {
			    done();
			}, function (status, e) {
			});
		});
	});
});


describe('Sanity Checks for Wilma PEP Proxy - AuthZForce Checks', function(done) {

	if(config.azf.enabled) {
	    describe('Testing configuration', function() {

			it('should have AZF server configured', function (done) {
				if (config.azf.host !== undefined && config.azf.host !== '') {
					if (config.azf.port !== undefined && config.azf.port !== '') {
						done();
					}
				}
			});
		});

		describe('Testing connection with AZF', function() {

	    	it('should have connectivity with AZF', function (done) {
				AZF.check_conn (function (status, b, c) {	
				}, function (status, e) {
					if (status === 401) {
				    	done();	
					};
				});
			});
		});

	    
	} else {
		it('AZF not enabled', function (done) {
			done();
		});
	}
});