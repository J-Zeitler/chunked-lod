'use strict';

var http = {
  get: function (url, callback, ctx) {
    if (typeof callback !== 'function') throw "http.get() needs a callback as second argument";

    ctx = ctx || this;

    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
      callback.call(ctx, {
        status: xhr.status,
        body: xhr.response
      });
    };

    xhr.open('GET', '/proxy?url=' + url, true);
    xhr.send();
  },

  getProxyUrl: function (url) {
    return '/proxy?url=' + url;
  }
};
