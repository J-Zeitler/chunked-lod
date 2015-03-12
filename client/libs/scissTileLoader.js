'use strict';

var ScissTileLoader = function (opts) {
  opts = opts || {};

  this.wmsProvider = opts.wmsProvider;
  this.layer = opts.layer || 'Earth_Global_Mosaic_Pan_Sharpened';

  this.flushImgSrc = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

  this.loadMap = {};
};

// ScissTileLoader.prototype = Object.create(TileLoader.prototype);

ScissTileLoader.prototype.getUrl = function (patch) {
  var SWNE = patch.getCornersDeg();
  var targetUrl = this.wmsProvider.getTileUrl(SWNE[0], SWNE[1], this.layer);
  return '/proxy?url=' + encodeURIComponent(targetUrl);
};

ScissTileLoader.prototype.loadTileTexture = function (patch, done, ctx) {
  var url = this.getUrl(patch);
  return this.loadTextureByUrl(url, done, ctx);
};

ScissTileLoader.prototype.loadTextureByUrl = function (url, done, ctx) {
  var img = document.createElement('img');

  img.onload = function () {
    done.call(ctx, img);
  };

  // start loading
  img.src = url;
};

ScissTileLoader.prototype.getActiveLayer = function () {
  return this.wmsProvider.getLayerByName(this.layer);
};

/**
 * Check if the ScissTileLoader is loading the tile for the supplied patch
 */
ScissTileLoader.prototype.isLoading = function (patch) {
  return this.loadMap.hasOwnProperty(patch.id);
};

ScissTileLoader.prototype.abortLoading = function (patch) {
  if (this.isLoading(patch)) {
    this.loadMap[patch.id].onload = function () {};
    this.loadMap[patch.id].src = this.flushImgSrc;
    this.loadMap[patch.id].abort();
  }
};
