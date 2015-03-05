var PlanetControls = function (opts) {
  this.camera = opts.camera;
  this.planetRadius = opts.planetRadius;

  this.key = 18; // ALT
  this.tiltMode = false;

  this.orbitCam = this.camera.clone();
  // Assume +Z is up for planets
  this.orbitCam.up.set(0, 0, 1);

  // Lock camera lookAt to surface point
  this.cube = opts.cube;
  this.cube.add(this.camera);

  this.orbitControls = new THREE.OrbitControls(this.orbitCam);
  this.orbitControls.noZoom = true;
  this.tiltControls = new THREE.OrbitControls(this.camera);

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

  // Reset camera position to default +Z and propagate through tiltControls
  var distFromSurface = this.camera.position.length() - proj.length();
  this.camera.position.set(0, 0, distFromSurface);
  this.tiltControls.update();
  this.tiltControls.enabled = false;

  window.addEventListener('keydown', this.handleKeyDown.bind(this), false);
  window.addEventListener('keyup', this.handleKeyUp.bind(this), false);
};

PlanetControls.prototype.update = function () {
  this.updateOrbitSpeed();

  this.cube.rotation.copy(this.orbitCam.rotation);
  this.cube.position.copy(this.orbitCam.position);

  if (this.tiltControls.enabled) {
    this.tiltControls.update();
  } else {
    this.orbitControls.update();
  }
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
  if (event.keyCode === this.key) {
    this.tiltControls.enabled = true;
    this.orbitControls.enabled = false;
  }
};

PlanetControls.prototype.handleKeyUp = function (event) {
  if (event.keyCode === this.key) {
    this.tiltControls.enabled = false;
    this.orbitControls.enabled = true;
  }
};


