var config = require('./config'),
    atob = require('atob'),
    fs = require('fs'),
    https = require('https'),
    Root = require('./controllers/root').Root,
    IDM = require("./lib/idm.js").IDM;

var express = require('express'),
    XMLHttpRequest = require("./lib/xmlhttprequest").XMLHttpRequest;

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});

var app = express();

//app.use(express.bodyParser());

app.use (function(req, res, next) {
    var data='';
    req.setEncoding('utf8');
    req.on('data', function(chunk) { 
       data += chunk;
    });

    req.on('end', function() {
        req.body = data;
        next();
    });
});

app.configure(function () {
    "use strict";
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    //app.use(express.logger());
    //app.use(express.static(__dirname + dirName));
    //app.set('views', __dirname + '/../views/');
    //disable layout
    //app.set("view options", {layout: false});
});

app.use(function (req, res, next) {
    "use strict";
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'HEAD, POST, GET, OPTIONS, DELETE');
    res.header('Access-Control-Allow-Headers', 'origin, content-type, X-Auth-Token, Tenant-ID, Authorization');
    //console.log("New Request: ", req.method);
    if (req.method == 'OPTIONS') {
        console.log("CORS request");
        res.statusCode = 200;
        res.header('Content-Length', '0');
        res.send();
        res.end();
    }
    else {
        next();
    }
});

var port = config.pep_port || 80;
if (config.https.enabled) port = config.https.port || 443;
app.set('port', port);

app.all('/*', Root.pep);

console.log('Starting PEP proxy in port ' + port + '. Keystone authentication ...');

IDM.authenticate (function (token) {

    console.log('Success authenticating PEP proxy. Proxy Auth-token: ', token);

    if (config.https.enabled === true) {
        var options = {
            key: fs.readFileSync(config.https.key_file),
            cert: fs.readFileSync(config.https.cert_file)
        };

        https.createServer(options, function(req,res) {
            app.handle(req, res);
        }).listen(app.get('port'));
    } else {
        app.listen(app.get('port'));
    }

}, function (status, e) {
    console.log('Error in keystone communication', e);
});


