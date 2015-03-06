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
app.get('/proxy', function(req, res) {
  var url = req.query.url;

  request(url, function (proxyErr, proxyRes, proxyBody) {
    if (proxyErr) {
      res.sendStatus(404);
    } else {
      res.send(proxyBody);
    }
  });
});

/**
 * Run server
 */
var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
