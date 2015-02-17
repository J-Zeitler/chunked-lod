var ChunkedCube = function (opts) {
  THREE.Object3D.call(this);

  this.opts = opts || {};

  this.tileRes = opts.tileRes || 16;
  this.maxScreenSpaceError = opts.maxScreenSpaceError || 2;
  this.camera = opts.camera;
  this.scaleFactor = opts.scale || 1;
  this.maxLevels = opts.maxLevels || 8;

  this.initTileTree();
};

ChunkedCube.prototype = Object.create(THREE.Object3D.prototype);

ChunkedCube.prototype.initSides = function () {

};

ChunkedCube.prototype.addChunkedPlane = function () {

};
