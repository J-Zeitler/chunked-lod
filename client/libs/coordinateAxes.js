'use strict';

var CoordinateAxes = function (opts) {
  THREE.Object3D.call(this);

  opts = opts || {};
  this.scaleFactor = opts.scale || 1;
  this.init();

};

CoordinateAxes.prototype = Object.create(THREE.Object3D.prototype);

CoordinateAxes.prototype.init = function () {
  this.addAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(this.scaleFactor, 0, 0), 0xFF0000, false); // +X
  this.addAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-this.scaleFactor, 0, 0), 0xFF0000, true); // -X
  this.addAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, this.scaleFactor, 0), 0x00FF00, false); // +Y
  this.addAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -this.scaleFactor, 0), 0x00FF00, true); // -Y
  this.addAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, this.scaleFactor), 0x0000FF, false); // +Z
  this.addAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -this.scaleFactor), 0x0000FF, true); // -Z
};

CoordinateAxes.prototype.addAxis = function (src, dst, colorHex, dashed) {
  var geom = new THREE.Geometry();
  var mat;

  if(dashed) {
    mat = new THREE.LineDashedMaterial({
      linewidth: 1,
      color: colorHex,
      dashSize: this.scaleFactor*0.01,
      gapSize: this.scaleFactor*0.01
    });
  } else {
    mat = new THREE.LineBasicMaterial({
      linewidth: 1,
      color: colorHex
    });
  }

  geom.vertices.push(src.clone());
  geom.vertices.push(dst.clone());
  geom.computeLineDistances(); // This one is SUPER important, otherwise dashed lines will appear as simple plain lines

  var axis = new THREE.Line(geom, mat, THREE.LinePieces);

  this.add(axis);
};
