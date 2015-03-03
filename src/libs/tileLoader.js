'use strict';

var TileLoader = function (opts) {
  opts = opts || {};

  this.baseUrl = opts.service.baseUrl;
  this.accessToken = opts.service.accessToken;
  this.layer = opts.layer || 'mapbox.streets';

  this.urlMap = {
    'TMS': this.getTMSUrl,
    'virtualearth': this.getVirtualEarthUrl,
    'onterra': this.getOnterraUrl
  };

  this.serviceType = opts.service.serviceType;
  this.getUrl = this.urlMap[this.serviceType];
  this.loadFunction = this.serviceType == 'onterra' ? this.loadEPSG4326TileTexture : this.loadEPSG3857TileTexture;
  this.abortFunction = this.serviceType == 'onterra' ? this.abortLoadingEPSG4326 : this.abortLoadingEPSG3857;

  this.flushImgSrc = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

  this.loadMap = {};
};

TileLoader.prototype.getTMSUrl = function (tile) {
  var z = tile.level;
  var x = tile.col;
  var y = tile.row;

  var url = [
    this.baseUrl,
    this.layer, '/',
    z, '/',
    x, '/',
    y,
    '.png',
    '?access_token=',
    this.accessToken
  ];

  return url.join('');
};

TileLoader.prototype.getVirtualEarthUrl = function (tile, top) {
  var idx = top ? tile.virtualEarthIndex.top : tile.virtualEarthIndex.bottom;

  var url = [
    this.baseUrl,
    idx,
    '.jpeg',
    '?g=',
    this.accessToken
  ];

  return url.join('');
};

TileLoader.prototype.getOnterraUrl = function (tile) {
  var SWNE = tile.getCornersDeg();
  var swneString = [SWNE[0].x, SWNE[0].y, SWNE[1].x, SWNE[1].y].join();

  var url = [
    this.baseUrl,
    '&bbox=', swneString
  ];

  return url.join('');
};

TileLoader.prototype.loadTileTexture = function (tile, callback, ctx) {
  return this.loadFunction(tile, callback, ctx);
};

TileLoader.prototype.loadEPSG4326TileTexture = function (tile, callback, ctx) {
  var url = this.getUrl(tile);

  var canvas = document.createElement("canvas");
  var canvasContext = canvas.getContext("2d");

  var img = document.createElement('img');
  img.crossOrigin = 'use-credentials';

  this.loadMap[tile.id] = img;

  img.abort = function () {
    callback.call(ctx, false);
    delete this.loadMap[tile.id];
  }.bind(this);

  var onload = function () {
    canvas.width = img.width;
    canvas.height = img.height;

    canvasContext.drawImage(img, 0, 0, img.width, img.height);

    var dataURL = canvas.toDataURL();
    delete this.loadMap[tile.id];
    callback.call(ctx, dataURL);
  }.bind(this);

  img.onload = onload;

  img.src = url;
};

/**
 * Load the two (epsg:3857 -> epsg:4326) textures of the tile
 */
TileLoader.prototype.loadEPSG3857TileTexture = function (tile, callback, ctx) {
  var topUrl = this.getUrl(tile, true);
  var bottomUrl = this.getUrl(tile, false);

  var canvas = document.createElement("canvas");
  var canvasContext = canvas.getContext("2d");

  // master: topImg, slave: bottomImg
  var topImg = document.createElement('img');
  var bottomImg = document.createElement('img');
  topImg.crossOrigin = 'anonymous';
  bottomImg.crossOrigin = 'anonymous';

  this.loadMap[tile.id] = {
    top: topImg,
    bottom: bottomImg
  };

  topImg.abort = function () {
    callback.call(ctx, false);
    delete this.loadMap[tile.id];
  }.bind(this);

  var checkpointTwo = function () {
    if (topImg.width != bottomImg.width || topImg.height != bottomImg.height) {
      throw "TileLoader: topImg does not have the same dimensions as bottomImg";
    }

    canvas.width = topImg.width;
    canvas.height = topImg.height;

    canvasContext.drawImage(topImg, 0, 0, topImg.width, topImg.height*0.5);
    canvasContext.drawImage(bottomImg, 0, topImg.height*0.5, bottomImg.width, bottomImg.height*0.5);

    var dataURL = canvas.toDataURL();
    delete this.loadMap[tile.id];
    callback.call(ctx, dataURL);
  }.bind(this);

  var checkpointOne = function () {
    topImg.onload = checkpointTwo;
    bottomImg.onload = checkpointTwo;
  };

  topImg.onload = checkpointOne;
  bottomImg.onload = checkpointOne;

  topImg.src = topUrl;
  bottomImg.src = bottomUrl;
};

/**
 * Check if the TileLoader is loading the supplied tile
 */
TileLoader.prototype.isLoading = function (tile) {
  return this.loadMap.hasOwnProperty(tile.id);
};

TileLoader.prototype.abortLoading = function (tile) {
  return this.abortFunction(tile);
};

TileLoader.prototype.abortLoadingEPSG4326 = function (tile) {
  if (this.isLoading(tile)) {
    this.loadMap[tile.id].onload = function () {};
    this.loadMap[tile.id].src = this.flushImgSrc;
    this.loadMap[tile.id].abort();
  }
};

TileLoader.prototype.abortLoadingEPSG3857 = function (tile) {
  if (this.isLoading(tile)) {
    this.loadMap[tile.id].top.onload = function () {};
    this.loadMap[tile.id].bottom.onload = function () {};
    this.loadMap[tile.id].top.src = this.flushImgSrc;
    this.loadMap[tile.id].bottom.src = this.flushImgSrc;

    this.loadMap[tile.id].top.abort();
  }
};
