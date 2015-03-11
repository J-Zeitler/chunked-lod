'use strict';

var TileProvider = function (opts) {
  opts = opts || {};

  this.wmsProvider = opts.wmsProvider;
  this.tileLoader = opts.tileLoader;
  this.requestLimit = opts.requestLimit || 80;
  this.cacheLimit = opts.cacheLimit || 999;

  this.queues = {};
  this.cache = {};
  this.requestBuffer = {};
};

TileProvider.prototype.addLayer = function (layer) {
  this.queues[layer.name] = new RequestQueue();
};

TileProvider.prototype.removeLayer = function (layer) {
  delete this.queues[layer.name];
};

TileProvider.prototype.requestTile = function (layer, bbox) {
  this.queues[layer.name].insert(bbox.join());
  // check chache
  this.populateRequestBuffer();
  // return promise
};

TileProvider.prototype.populateRequestBuffer = function () {
  var queues = Object.keys(queues);
  queues.forEach(function (layer) {
    var q = this.queues[layer];
    while (Object.keys(requestBuffer).length < this.requestLimit) {
      var bbox = q.pop();

    }
  }, this);
};
