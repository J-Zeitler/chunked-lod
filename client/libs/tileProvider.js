'use strict';

/**
 * Handles tile/texture requests through a TileLoader.
 * @param {Object}  opts  initialization object.
 *
 * Example construction:
 *
 * var tileProvider = new TileProvider({
 *    // required
 *    tileLoader: {TileLoader},
 *
 *    //optional
 *    requestLimit: {Number},
 *    cacheLimit: {Number},
 *    noFilter: {Boolean}
 *  });
 */
var TileProvider = function (opts) {
  opts = opts || {};

  this.tileLoader = opts.tileLoader;
  this.requestLimit = opts.requestLimit || 80;
  this.cacheLimit = opts.cacheLimit || 199;
  this.noFilter = opts.noFilter || false;

  this.cache = new Cache({capacity: this.cacheLimit});
  this.currentRequests = new Set();
};

/**
 * Requests the full texture [(-180, 90), (180, -90)]
 * @param  {Function} done  texture onload callback
 * @param  {scope}    ctx   callback context
 */
TileProvider.prototype.requestFull = function (done, ctx) {
  this.tileLoader.loadFullTexture(function (img) {
    TileProvider.returnAsTexture(img, done, ctx, true);
  }, this);
};

/**
 * Requests the texture for a single SpherePatch
 * @param  {SpherePatch}  patch
 * @param  {Function}     done  texture onload callback
 * @param  {scope}        ctx   callback context
 */
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

/**
 * Get the active layer from the TileProvider's TileLoader.
 * @return {Layer}
 */
TileProvider.prototype.getActiveLayer = function () {
  return this.tileLoader.getActiveLayer();
};

/////////////////////
/// Static
/////////////////////

/**
 * Wraps an image as a texture for use on the GPU.
 * @param  {Image}    img
 * @param  {Function} done      texture onload callback
 * @param  {scope}    ctx       callback context
 * @param  {boolean}  noFilter  do not generate mipmaps and use nearest filter
 */
TileProvider.returnAsTexture = function (img, done, ctx, noFilter) {
  var texture = new THREE.Texture(img);

  texture.needsUpdate = true;

  if (noFilter) {
    texture.generateMipmaps = false;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
  }

  done.call(ctx, texture);
};
