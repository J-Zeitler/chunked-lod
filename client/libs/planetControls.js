var PlanetControls = function (opts) {
  this.camera = opts.camera;
  this.planetRadius = opts.planetRadius;

  this.tiltKey = 17; // CTRL
  this.tiltMode = false;

  this.orbitCam = this.camera.clone();

  // Lock camera lookAt to surface point
  this.cube = opts.cube;
  this.cube.add(this.camera);

  this.orbitControls = new THREE.TrackballControls(this.orbitCam);
  this.orbitControls.noZoom = true;
  this.tiltControls = new THREE.OrbitControls(this.camera);

  this.tiltControls.minPolarAngle = Math.PI*0.0;
  this.tiltControls.maxPolarAngle = Math.PI*0.4;

  this.tiltCamZRotation = 0;

  this.tiltCamDefaultLookDir = new THREE.Vector3(0, 0, 1);

  this.init();
};

PlanetControls.prototype.init = function () {
  // lock orbit cam to planet surface
  var proj = this.getCameraPlanetProjection(this.orbitCam).multiplyScalar(1.00001);
  this.orbitCam.position.set(proj.x, proj.y, proj.z);

  // Reset camera position to default +Z and propagate through tiltControls
  var distFromSurface = this.camera.position.length() - proj.length();
  this.camera.position.copy(this.tiltCamDefaultLookDir.clone().multiplyScalar(distFromSurface));
  this.tiltControls.update();
  // this.tiltControls.enabled = false;
  this.tiltControls.noRotate = true;
  this.tiltControls.noPan = true;

  window.addEventListener('keydown', this.handleKeyDown.bind(this), false);
  window.addEventListener('keyup', this.handleKeyUp.bind(this), false);
};

PlanetControls.prototype.update = function () {
  this.updateOrbitSpeed();

  this.cube.rotation.copy(this.orbitCam.rotation);
  this.cube.position.copy(this.orbitCam.position);

  this.tiltControls.update();
  this.updateTiltCamRotation();
  this.orbitControls.update();
};

PlanetControls.prototype.updateOrbitSpeed = function () {
  var camToSurface = this.camera.position.length();
  var speed = Math.abs(Math.atan(camToSurface/this.planetRadius));
  this.orbitControls.rotateSpeed = speed;
};

PlanetControls.prototype.getCameraPlanetProjection = function (cam) {
  return cam.position.clone().normalize().multiplyScalar(this.planetRadius);
};

PlanetControls.prototype.handleKeyDown = function (event) {
  if (event.keyCode === this.tiltKey) {
    this.tiltControls.noRotate = false;
    this.tiltControls.noPan = false;
    this.orbitControls.enabled = false;
  }
};

PlanetControls.prototype.handleKeyUp = function (event) {
  if (event.keyCode === this.tiltKey) {
    this.tiltControls.noRotate = true;
    this.tiltControls.noPan = true;
    this.orbitControls.enabled = true;
  }
};

PlanetControls.prototype.updateTiltCamRotation = function () {
  var newRotZ = this.camera.rotation._z;
  if (this.tiltCamZRotation != newRotZ) {
    this.tiltCamZRotation = newRotZ;
    this.orbitControls.setZRotation(newRotZ);
  }
};
