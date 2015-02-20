var PlanetControls = function (opts) {
  this.camera = opts.camera;
  this.planetRadius = opts.planetRadius;

  this.key = 18; // ALT
  this.tiltMode = false;

  this.orbitCam = this.camera.clone();

  this.cube = opts.cube;
  this.cube.add(this.camera);

  this.orbitControls = new THREE.OrbitControls(this.orbitCam);
  this.orbitControls.noZoom = true;
  this.tiltControls = new THREE.OrbitControls(this.camera);
  this.tiltControls.enabled = false;

  this.tiltControls.minPolarAngle = 0.1;
  this.tiltControls.maxPolarAngle = Math.PI*0.9;
  this.tiltControls.minAzimuthAngle = - Math.PI*0.4;
  this.tiltControls.maxAzimuthAngle = Math.PI*0.4;

  this.init();
};

PlanetControls.prototype.init = function () {
  // lock orbit cam to planet surface
  var proj = this.getCameraPlanetProjection(this.orbitCam).multiplyScalar(1.00001);
  this.orbitCam.position.set(proj.x, proj.y, proj.z);

  window.addEventListener('keydown', this.handleKeyDown.bind(this), false);
  window.addEventListener('keyup', this.handleKeyUp.bind(this), false);
};

PlanetControls.prototype.update = function () {
  this.orbitControls.rotateSpeed = this.orbitControls.rotateSpeed;

  this.cube.rotation.copy(this.orbitCam.rotation);
  this.cube.position.copy(this.orbitCam.position);

  if (this.tiltControls.enabled) {
    this.tiltControls.update();
  } else {
    this.orbitControls.update();
  }
};

PlanetControls.prototype.getCameraPlanetProjection = function (cam) {
  return cam.position.clone().normalize().multiplyScalar(this.planetRadius);
};

PlanetControls.prototype.setZoomSpeed = function (zoomSpeed) {
  this.orbitControls.zoomSpeed = zoomSpeed;
};

PlanetControls.prototype.setRotateSpeed = function (rotateSpeed) {
  this.orbitControls.rotateSpeed = rotateSpeed;
};

PlanetControls.prototype.handleKeyDown = function (event) {
  if (event.keyCode === this.key) {
    this.tiltControls.enabled = true;
    this.orbitControls.enabled = false;
    // console.log(this.camera.position.clone().applyMatrix4(this.camera.matrixWorld));
  }
};

PlanetControls.prototype.handleKeyUp = function (event) {
  if (event.keyCode === this.key) {
    this.tiltControls.enabled = false;
    this.orbitControls.enabled = true;
  }
};


