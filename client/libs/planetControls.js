'use strict';

/**
 * A combination of THREE.OrbitControls and THREE.TrackballControls to add "tilt" to the camera.
 * @param {Object}  opts  initialization object.
 *
 * Example construction:
 *
 * var controls = new THREE.PlanetControls({
 *   camera: camera,
 *   planet: lodSphere
 * });
 *
 */
THREE.PlanetControls = function (opts) {
  this.camera = opts.camera;
  this.planet = opts.planet;

  this.tiltKey = 17; // CTRL
  this.tiltMode = false;

  this.orbitCam = this.camera.clone();

  // Lock camera lookAt to surface point
  this.surfaceHandle = new THREE.Object3D();
  this.planet.add(this.surfaceHandle);
  this.surfaceHandle.add(this.camera);

  this.orbitControls = new THREE.TrackballControls(this.orbitCam);
  this.orbitControls.noZoom = true;
  this.tiltControls = new THREE.OrbitControls(this.camera);

  this.tiltCamZRotation = 0;

  this.tiltCamDefaultLookDir = new THREE.Vector3(0, 0, 1);

  this.init();
};

THREE.PlanetControls.prototype.init = function () {
  // lock orbit cam to planet surface
  var proj = this.getCameraPlanetProjection(this.orbitCam).multiplyScalar(1.00001);
  this.orbitCam.position.set(proj.x, proj.y, proj.z);

  // Reset camera position to default +Z and propagate through tiltControls
  var distFromSurface = this.camera.position.length() - proj.length();
  this.camera.position.copy(this.tiltCamDefaultLookDir.clone().multiplyScalar(distFromSurface));
  this.tiltControls.update();

  // Init constraints
  this.orbitControls.noPan = true;

  this.tiltControls.noRotate = true;
  this.tiltControls.noPan = true;

  this.tiltControls.minPolarAngle = Math.PI*0.0;
  this.tiltControls.maxPolarAngle = Math.PI*0.4;

  window.addEventListener('keydown', this.handleKeyDown.bind(this), false);
  window.addEventListener('keyup', this.handleKeyUp.bind(this), false);
};

THREE.PlanetControls.prototype.update = function () {
  this.updateOrbitSpeed();

  this.surfaceHandle.rotation.copy(this.orbitCam.rotation);
  this.surfaceHandle.position.copy(this.orbitCam.position);

  this.tiltControls.update();
  this.updateTiltCamRotation();
  this.orbitControls.update();
};

THREE.PlanetControls.prototype.updateOrbitSpeed = function () {
  var camToSurface = this.camera.position.length();
  var speed = Math.abs(Math.atan(camToSurface/this.planet.radius));
  this.orbitControls.rotateSpeed = speed;
};

THREE.PlanetControls.prototype.getCameraPlanetProjection = function (cam) {
  return cam.position.clone().normalize().multiplyScalar(this.planet.radius);
};

THREE.PlanetControls.prototype.handleKeyDown = function (event) {
  if (event.keyCode === this.tiltKey) {
    this.tiltControls.noZoom = true;
    this.tiltControls.noRotate = false;
    this.orbitControls.enabled = false;
  }
};

THREE.PlanetControls.prototype.handleKeyUp = function (event) {
  if (event.keyCode === this.tiltKey) {
    this.tiltControls.noZoom = false;
    this.tiltControls.noRotate = true;
    this.orbitControls.enabled = true;
  }
};

THREE.PlanetControls.prototype.updateTiltCamRotation = function () {
  var newRotZ = this.camera.rotation._z;
  if (this.tiltCamZRotation != newRotZ) {
    this.tiltCamZRotation = newRotZ;
    this.orbitControls.setZRotation(newRotZ);
  }
};
