'use strict';

var express = require('express');
var app = express();
var request = require('request');

/**
 * Static content
 */
app.use('/', express.static(__dirname + '/../client'));

/**
 * HTTP Proxy
 *
 * Note: Catch-all proxies might be dangerous on a live server.
 */
app.use('/proxy', function (req, res) {
  var url = req.query;
  // console.log(url);
  req.pipe(request[req.method.toLowerCase()](url)).pipe(res);
});

/**
 * Run server
 */
var server = app.listen(3002, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Web server listening at http://%s:%s', host, port);
});
