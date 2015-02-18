var ChunkedCube = function (opts) {
  THREE.Object3D.call(this);

  this.opts = opts || {};

  this.tileRes = opts.tileRes || 16;
  this.maxScreenSpaceError = opts.maxScreenSpaceError || 2;
  this.camera = opts.camera;
  this.worldScale = opts.scale || 1;
  this.maxLevels = opts.maxLevels || 8;

  this.sides = [];
  this.initSides();
};

ChunkedCube.prototype = Object.create(THREE.Object3D.prototype);

ChunkedCube.prototype.initSides = function () {
  var rotation = new THREE.Matrix4();
  var translation = new THREE.Matrix4();

  // pos-x
  rotation.makeRotationY(Math.PI*0.5);
  translation.makeTranslation(this.worldScale*0.5, 0.0, 0.0);
  this.addChunkedPlane(rotation, translation);

  // neg-x
  rotation.makeRotationY(-Math.PI*0.5);
  translation.makeTranslation(-this.worldScale*0.5, 0.0, 0.0);
  this.addChunkedPlane(rotation, translation);

  // pos-y
  rotation.makeRotationX(-Math.PI*0.5);
  translation.makeTranslation(0.0, this.worldScale*0.5, 0.0);
  this.addChunkedPlane(rotation, translation);

  // neg-y
  rotation.makeRotationX(Math.PI*0.5);
  translation.makeTranslation(0.0, -this.worldScale*0.5, 0.0);
  this.addChunkedPlane(rotation, translation);

  // pos-z
  rotation.makeRotationY(0.0); // for consistency :)
  translation.makeTranslation(0.0, 0.0, this.worldScale*0.5);
  this.addChunkedPlane(rotation, translation);

  // neg-z
  rotation.makeRotationY(Math.PI);
  translation.makeTranslation(0.0, 0.0, -this.worldScale*0.5);
  this.addChunkedPlane(rotation, translation);
};

ChunkedCube.prototype.addChunkedPlane = function (rot, trans) {
  var transform = new THREE.Matrix4();
  transform.multiplyMatrices(trans, rot);

  var plane = new ChunkedPlane(this.opts);
  plane.applyMatrix(transform);
  this.add(plane);
  this.sides.push(plane);
};

ChunkedCube.prototype.update = function () {
  this.sides.forEach(function(s) {s.update()});
};

