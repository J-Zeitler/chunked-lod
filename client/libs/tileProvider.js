'use strict';

var TileProvider = function (opts) {
  opts = opts || {};

  this.tileLoader = opts.tileLoader;
  this.requestLimit = opts.requestLimit || 80;
  this.cacheLimit = opts.cacheLimit || 199;
  this.noFilter = opts.noFilter || false;

  this.cache = new Cache({capacity: this.cacheLimit});
  this.currentRequests = new Set();
};

TileProvider.prototype.requestTile = function (patch, done, ctx) {
  var url = this.tileLoader.getUrl(patch);

  if (this.currentRequests.has(url) || this.currentRequests.size >= this.requestLimit) {
    done.call(ctx, false);
    return;
  }

  var cachedTile = this.cache.find(url);
  if (cachedTile) {
    TileProvider.returnAsTexture(cachedTile.value, done, ctx, this.noFilter);
  } else {
    this.currentRequests.add(url);
    this.tileLoader.loadTextureByUrl(url, function (img) {
      TileProvider.returnAsTexture(img, done, ctx, this.noFilter);
      this.cache.insert(url, img);
      this.currentRequests.delete(url);
    }, this);
  }
};

TileProvider.prototype.getActiveLayer = function () {
  return this.tileLoader.getActiveLayer();
};

/////////////////////
/// Static
/////////////////////

TileProvider.returnAsTexture = function (img, done, ctx, noFilter) {
  var texture = new THREE.Texture(img);

  texture.needsUpdate = true;


  if (noFilter) {
    texture.generateMipmaps = false;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    // texture.magFilter = THREE.LinearFilter;
    // texture.minFilter = THREE.LinearFilter;
  }

  done.call(ctx, texture);
};
