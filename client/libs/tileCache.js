'use strict';

var TileCache = function (opts) {
  opts = opts || {};

  // set max cached tiles
  // set decision strategy
  // init queues

  this.queues = {};

};

TileCache.prototype.addLayer = function (layer) {
  this.queues[layer.name] = new TileQueue();
};

TileCache.prototype.removeLayer = function (layer) {
  
};

TileCache.prototype.requestTile = function (layer, bbox) {

};
