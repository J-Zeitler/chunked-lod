'use strict';

var ScissTileLoader = function (opts) {
  opts = opts || {};

  this.provider = opts.provider;
  this.layer = opts.layer || 'Earth_Global_Mosaic_Pan_Sharpened';

  this.flushImgSrc = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

  this.loadMap = {};
};

// ScissTileLoader.prototype = Object.create(TileLoader.prototype);

ScissTileLoader.prototype.getUrl = function (tile) {
  var SWNE = tile.getCornersDeg();
  var targetUrl = this.provider.getTileUrl(SWNE[0], SWNE[1], this.layer);
  return '/proxy?url=' + encodeURIComponent(targetUrl);
};

ScissTileLoader.prototype.loadTileTexture = function (tile, callback, ctx) {
  var url = this.getUrl(tile);

  var img = document.createElement('img');
  var texture = new THREE.Texture(img);

  img.onload = function () {
    texture.needsUpdate = true;
    callback.call(ctx, texture);
  };

  // start loading
  img.src = url;

  texture.generateMipmaps = false;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
};

/**
 * Check if the ScissTileLoader is loading the supplied tile
 */
ScissTileLoader.prototype.isLoading = function (tile) {
  return this.loadMap.hasOwnProperty(tile.id);
};

ScissTileLoader.prototype.abortLoading = function (tile) {
  if (this.isLoading(tile)) {
    this.loadMap[tile.id].onload = function () {};
    this.loadMap[tile.id].src = this.flushImgSrc;
    this.loadMap[tile.id].abort();
  }
};
