var ChunkedCubeSphere = function (opts) {
  THREE.Object3D.call(this);

  this.opts = opts || {};

  this.tileRes = opts.tileRes || 16;
  this.maxScreenSpaceError = opts.maxScreenSpaceError || 2;
  this.camera = opts.camera;
  this.radius = opts.scale || 1;
  this.maxLevels = opts.maxLevels || 32;

  this.texture = opts.texture;
  this.vertShader = opts.shaders.vert;
  this.fragShader = opts.shaders.frag;

  this.perspectiveScaling = 1;
  this.updatePerspectiveScaling();

  this.widthDir = opts.widthDir || new THREE.Vector3(1, 0, 0);
  this.heightDir = opts.heightDir || new THREE.Vector3(0, 1, 0);

  this.frustum = new THREE.Frustum();

  // debug
  this.debug = new THREE.Object3D();
  this.debug.name = "debug";
  opts.scene.add(this.debug);

  this.sides = [];
  this.initSides();
};

ChunkedCubeSphere.prototype = Object.create(THREE.Object3D.prototype);

ChunkedCubeSphere.prototype.initSides = function () {
  var rotation = new THREE.Matrix4();
  var translation = new THREE.Matrix4();

  // pos-x
  rotation.makeRotationY(Math.PI*0.5);
  translation.makeTranslation(this.radius, 0.0, 0.0);
  this.addSide(rotation, translation);

  // neg-x
  rotation.makeRotationY(-Math.PI*0.5);
  translation.makeTranslation(-this.radius, 0.0, 0.0);
  this.addSide(rotation, translation);

  // pos-y
  rotation.makeRotationX(-Math.PI*0.5);
  translation.makeTranslation(0.0, this.radius, 0.0);
  this.addSide(rotation, translation);

  // neg-y
  rotation.makeRotationX(Math.PI*0.5);
  translation.makeTranslation(0.0, -this.radius, 0.0);
  this.addSide(rotation, translation);

  // pos-z
  rotation.makeRotationY(0.0); // for consistency :)
  translation.makeTranslation(0.0, 0.0, this.radius);
  this.addSide(rotation, translation);

  // neg-z
  rotation.makeRotationY(Math.PI);
  translation.makeTranslation(0.0, 0.0, -this.radius);
  this.addSide(rotation, translation);
};

ChunkedCubeSphere.prototype.addSide = function (trans, rot) {
  var transform = new THREE.Matrix4();
  transform.multiplyMatrices(rot, trans);

  var rootTile = new TileNode({
    position: new THREE.Vector3(0, 0, 0),
    parent: null,
    master: this,
    level: 0,
    ulrichFactor: 0.008*this.radius,
    transform: transform
  });

  this.sides.push(rootTile);
};

ChunkedCubeSphere.prototype._cube2sphere = function (cube) {
  cube.divideScalar(this.radius);

  var x2 = cube.x*cube.x;
  var y2 = cube.y*cube.y;
  var z2 = cube.z*cube.z;
  var sphere = new THREE.Vector3(
    cube.x*Math.sqrt(1.0 - y2*0.5 - z2*0.5 + y2*z2*0.3333333),
    cube.y*Math.sqrt(1.0 - x2*0.5 - z2*0.5 + x2*z2*0.3333333),
    cube.z*Math.sqrt(1.0 - x2*0.5 - y2*0.5 + x2*y2*0.3333333)
  );

  return sphere.multiplyScalar(this.radius);
};

ChunkedCubeSphere.prototype._spherifyVerts = function (geometry) {
  var verts = geometry.attributes.position.array;
  for (var i = 0; i < verts.length; i += 3) {
    var pos = new THREE.Vector3(verts[i], verts[i + 1], verts[i + 2]);
    pos = this._cube2sphere(pos);
    verts[i] = pos.x;
    verts[i + 1] = pos.y;
    verts[i + 2] = pos.z;
  }
};

ChunkedCubeSphere.prototype.addTile = function (tile) {
  var tileGeometry = new THREE.PlaneBufferGeometry(tile.scale, tile.scale, this.tileRes, this.tileRes);

  var tileMaterial;
  if (this.vertShader && this.fragShader) {
    var tileUniforms = {
      worldScale: {type: "f", value: this.radius},
      level: {type: "f", value: tile.level},
      texMap: {type: "t", value: this.texture}
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
  tileGeometry.applyMatrix(tile.transform);

  this._spherifyVerts(tileGeometry);

  var tileMesh = new THREE.Mesh(
    tileGeometry,
    tileMaterial
  );

  // tileMesh.frustumCulled = false;
  tileMesh.name = tile.id;

  this.add(tileMesh);
};

ChunkedCubeSphere.prototype.removeTile = function (tile) {
  var selectedTile = this.getObjectByName(tile.id);
  if (selectedTile) {
    selectedTile.geometry.dispose();
    selectedTile.material.dispose();
    this.remove(selectedTile);
  }
};

ChunkedCubeSphere.prototype.addDebugPoint = function (pos) {
  var geometry = new THREE.SphereGeometry(this.radius*0.01, 2, 2);
  var material = new THREE.MeshBasicMaterial({color: 0xffff00});
  var debugSphere = new THREE.Mesh( geometry, material );
  debugSphere.position.x = pos.x;
  debugSphere.position.y = pos.y;
  debugSphere.position.z = pos.z;
  this.debug.add(debugSphere);
};

ChunkedCubeSphere.prototype.update = function () {
  this.updatePerspectiveScaling();
  this.updateFrustum();
  this.calculateCameraWorldPosition();

  this.debug.children.forEach(function (c) {
    c.geometry.dispose();
    c.material.dispose();
    this.debug.remove(c);
  }, this);

  this.sides.forEach(function (s) {
    s.update();
  });
};

ChunkedCubeSphere.prototype.getMaxScreenSpaceError = function () {
  return this.maxScreenSpaceError;
};

ChunkedCubeSphere.prototype.getMaxLodLevel = function () {
  return this.maxLevels;
};

ChunkedCubeSphere.prototype.getWidthDir = function () {
  return this.widthDir.clone();
};

ChunkedCubeSphere.prototype.getHeightDir = function () {
  return this.heightDir.clone();
};

ChunkedCubeSphere.prototype.getScale = function () {
  return this.radius*2;
};

ChunkedCubeSphere.prototype.getRadius = function () {
  return this.radius;
};

ChunkedCubeSphere.prototype.calculateCameraWorldPosition = function () {
  this.camera.updateMatrix();
  this.cameraWorldPosition = this.camera.position.clone().applyMatrix4(this.camera.parent.matrix);
};

ChunkedCubeSphere.prototype.getCameraPosition = function () {
  return this.cameraWorldPosition.clone();
};

ChunkedCubeSphere.prototype.getDistanceToTile = function (tile) {
  var minDist = Infinity;
  var camPos = this.getCameraPosition();

  tile.corners.forEach(function (corner) {
    var tilePos = corner.clone().applyMatrix4(tile.transform);
    var spherePos = this._cube2sphere(tilePos);
    spherePos.applyMatrix4(this.matrix);

    var dist = camPos.distanceTo(spherePos);
    minDist = dist < minDist ? dist : minDist;
  }, this);

  return minDist;
};

ChunkedCubeSphere.prototype.getCamToCenter = function () {
  return this.getCameraPosition().multiplyScalar(-1);
};

ChunkedCubeSphere.prototype.getCamToTile = function (tile) {
  var minDist = Infinity;
  var closestCorner = new THREE.Vector3();
  var camPos = this.getCameraPosition();

  tile.corners.forEach(function (corner) {
    var tilePos = corner.clone().applyMatrix4(tile.transform);
    var spherePos = this._cube2sphere(tilePos);
    spherePos.applyMatrix4(this.matrix);

    var dist = camPos.distanceTo(spherePos);

    if (dist < minDist) {
      minDist = dist;
      closestCorner = spherePos;
    }
  }, this);

  return closestCorner.sub(camPos);
};

ChunkedCubeSphere.prototype.isTileInFrustum = function (tile) {
  this.camera.updateMatrix();
  this.camera.updateMatrixWorld();
  this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);

  // same transform as above
  var tileGeometry = new THREE.PlaneBufferGeometry(tile.scale, tile.scale, 1, 1);
  var translation = new THREE.Matrix4().makeTranslation(
    tile.position.x,
    tile.position.y,
    tile.position.z
  );
  tileGeometry.applyMatrix(translation);
  tileGeometry.applyMatrix(tile.transform);
  this._spherifyVerts(tileGeometry);

  tileGeometry.computeBoundingBox();

  if (this.frustum.intersectsBox(tileGeometry.boundingBox)) return true;
  return false;
};

ChunkedCubeSphere.prototype.getPerspectiveScaling = function () {
  return this.perspectiveScaling;
};

/**
 * Calculate horizontal perspective scaling factor.
 * Divide by object dist to camera to get number of pixels per unit at that dist.
 */
ChunkedCubeSphere.prototype.updatePerspectiveScaling = function () {
  var vFOV = this.camera.fov*Math.PI/180;
  var heightScale = 2*Math.tan(vFOV/2);
  var aspect = window.innerWidth/window.innerHeight;

  this.perspectiveScaling = window.innerWidth/(aspect*heightScale);
};

ChunkedCubeSphere.prototype.updateFrustum = function () {
  this.frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
};
