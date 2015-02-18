var ChunkedPlane = function (opts) {
  THREE.Object3D.call(this);

  this.opts = opts || {};

  this.tileRes = opts.tileRes || 16;
  this.maxScreenSpaceError = opts.maxScreenSpaceError || 2;
  this.camera = opts.camera;
  this.scaleFactor = opts.scale || 1;
  this.maxLevels = opts.maxLevels || 8;

  this.vertShader = opts.shaders.vert;
  this.fragShader = opts.shaders.frag;

  this.perspectiveScaling = 1;
  this.updatePerspectiveScaling();

  this.widthDir = opts.widthDir || new THREE.Vector3(1, 0, 0);
  this.heightDir = opts.heightDir || new THREE.Vector3(0, 1, 0);

  this.initTileTree();
};

ChunkedPlane.prototype = Object.create(THREE.Object3D.prototype);

ChunkedPlane.prototype.initTileTree = function () {
  this.rootTile = new TileNode({
    position: new THREE.Vector3(0, 0, 0),
    parent: null,
    master: this,
    level: 0,
    ulrichFactor: 0.02*this.scaleFactor
  });
};

ChunkedPlane.prototype.addTile = function (tile) {
  var tileGeometry = new THREE.PlaneBufferGeometry(tile.scale, tile.scale, this.tileRes, this.tileRes);

  var tileMaterial;
  if (this.vertShader && this.fragShader) {
    var tileUniforms = {
      worldScale: {type: "f", value: this.scaleFactor*0.5},
      level: {type: "f", value: tile.level}
    };

    tileMaterial = new THREE.ShaderMaterial({
      uniforms: tileUniforms,
      vertexShader: this.vertShader,
      fragmentShader: this.fragShader
    });

    tileMaterial.wireframe = true;
    tileMaterial.wireframeLinewidth = 1.0;
  } else {
    tileMaterial = new THREE.MeshBasicMaterial({wireframe: true, color: 'red'});
  }

  var translation = new THREE.Matrix4().makeTranslation(
    tile.position.x,
    tile.position.y,
    tile.position.z
  );
  tileGeometry.applyMatrix(translation);

  var tileMesh = new THREE.Mesh(
    tileGeometry,
    tileMaterial
  );

  // tileMesh.frustumCulled = false;
  tileMesh.name = tile.id;

  this.add(tileMesh);
};

ChunkedPlane.prototype.removeTile = function (tile) {
  var selectedTile = this.getObjectByName(tile.id);
  if (selectedTile) {
    selectedTile.geometry.dispose();
    selectedTile.material.dispose();
    this.remove(selectedTile);
  }
};

ChunkedPlane.prototype.getCameraPosition = function () {
  var invModelMatrix = new THREE.Matrix4();
  invModelMatrix.getInverse(this.matrix);

  var localCam = this.camera.position.clone().applyMatrix4(invModelMatrix);

  return localCam;
};

ChunkedPlane.prototype.update = function () {
  this.updatePerspectiveScaling();
  this.rootTile.update();
};

ChunkedPlane.prototype.getPerspectiveScaling = function () {
  return this.perspectiveScaling;
};

ChunkedPlane.prototype.getMaxScreenSpaceError = function () {
  return this.maxScreenSpaceError;
};

ChunkedPlane.prototype.getMaxLodLevel = function () {
  return this.maxLevels;
};

ChunkedPlane.prototype.getWidthDir = function () {
  return this.widthDir.clone();
};

ChunkedPlane.prototype.getHeightDir = function () {
  return this.heightDir.clone();
};

ChunkedPlane.prototype.getScale = function () {
  return this.scaleFactor;
};

// TODO: This does not follow the Cube/Plane approach
ChunkedPlane.prototype.getDistanceToTile = function (tile) {
  var tilePos = tile.position.clone();
  tilePos.applyMatrix4(this.matrix);
  return this.camera.position.distanceTo(tilePos);
};

/**
 * Calculate horizontal perspective scaling factor.
 * Divide by object dist to camera to get number of pixels per unit at that dist.
 */
ChunkedPlane.prototype.updatePerspectiveScaling = function () {
  var vFOV = this.camera.fov*Math.PI/180;
  var heightScale = 2*Math.tan(vFOV/2);
  var aspect = window.innerWidth/window.innerHeight;

  this.perspectiveScaling = window.innerWidth/(aspect*heightScale);
};
