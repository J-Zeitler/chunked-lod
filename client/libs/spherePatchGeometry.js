'use strict';

/**
 * Creates a curved patch geometry to approximate a part of a sphere.
 * Surrounds the patch with a skirt to hide cracks in the surface.
 *
 * @param THREE.Vector2   anchor    position (φ,θ) on sphere
 * @param Number          extent    equirectangular extend from (φ,θ) to (φ + extent,θ + extent)
 * @param Number          res       number of vertices along each direction
 * @param Number          radius    sphere radius
 */
THREE.SpherePatchGeometry = function (anchor, extent, res, radius) {

  THREE.BufferGeometry.call(this);

  this.type = 'SpherePatchGeometry';

  this.res = res || 1;
  this.extent = extent || 1;
  this.anchor = anchor || new THREE.Vector2(0, 0);
  this.radius = radius || 1;

  // Positions + uvs
  var resMinus1 = this.res - 1;
  var resPlus1 = this.res + 1;
  var resPlus2 = this.res + 2;
  var scale = this.extent/resMinus1;
  var positions = new Float32Array(resPlus2*resPlus2*3);
  var uvs = new Float32Array(resPlus2*resPlus2*2);
  for (var y = 0; y < resPlus2; y++) {
    for (var x = 0; x < resPlus2; x++) {
      var r = this.radius;
      if (x < 1 || x > this.res || y < 0 || y > this.res) {
        r *= (1.0 - 0.05*this.extent);
      }

      var xx = x > this.res ? x - 2 : (x > 0 ? x - 1 : x);
      var yy = y > this.res ? y - 2 : (y > 0 ? y - 1 : y);

      var posOffset = (y*resPlus2 + x)*3;
      var phi = this.anchor.x + xx*scale;
      var theta = this.anchor.y + yy*scale;

      // Tuck verts in at south pole and on antimeridian
      if (phi > 2.0*Math.PI) {
        phi = 2.0*Math.PI;
      }
      if (theta > Math.PI) {
        theta = Math.PI;
      }

      var pos = MathUtils.polarToCartesian(phi, theta, r);

      positions[posOffset] = pos.x;
      positions[posOffset + 1] = pos.y;
      positions[posOffset + 2] = pos.z;

      var uvOffset = (y*resPlus2 + x)*2;
      uvs[uvOffset] = xx/resMinus1;
      uvs[uvOffset + 1] = 1 - yy/resMinus1;
    }
  }

  // Indices
  var segs = (resPlus1)*(resPlus1);
  var indexData = [];
  for (var y = 0; y < resPlus1; y++) {
    for (var x = 1; x < resPlus2; x++) {
      var i = y*resPlus2 + x;

      var self = i;
      var down = i + resPlus2;
      var left = i - 1;
      var leftDown = left + resPlus2;

      // top left
      indexData.push(self);
      indexData.push(left);
      indexData.push(leftDown);

      // bottom right
      indexData.push(self);
      indexData.push(leftDown);
      indexData.push(down);
    }
  }

  var indices = new Uint16Array(segs*3*2);
  indices.set(indexData);

  this.addAttribute('position', new THREE.BufferAttribute(positions, 3));
  this.addAttribute('index', new THREE.BufferAttribute(indices, 1));
  this.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));

  this.computeBoundingBox();
};

THREE.SpherePatchGeometry.prototype = Object.create(THREE.BufferGeometry.prototype);
THREE.SpherePatchGeometry.prototype.constructor = THREE.SpherePatchGeometry;

THREE.SpherePatchGeometry.prototype.getBoundingBoxCorners = function () {
  if (!this.bboxCorners) {
    this.bboxCorners = [];
    var bbox = this.boundingBox;

    var min = bbox.min.clone();
    var max = bbox.max.clone();

    this.bboxCorners.push(min); // 0

    this.bboxCorners.push(new THREE.Vector3(max.x, min.y, min.z)); // 1, x
    this.bboxCorners.push(new THREE.Vector3(min.x, max.y, min.z)); // 2, y
    this.bboxCorners.push(new THREE.Vector3(min.x, min.y, max.z)); // 3, z

    this.bboxCorners.push(new THREE.Vector3(min.x, max.y, max.z)); // 4, yz
    this.bboxCorners.push(new THREE.Vector3(max.x, min.y, max.z)); // 5, xz
    this.bboxCorners.push(new THREE.Vector3(max.x, max.y, min.z)); // 6, xy

    this.bboxCorners.push(max); // 7
  }

  return this.bboxCorners;
};

THREE.SpherePatchGeometry.prototype.getBoundingBoxTriangles = function () {
  if (!this.bboxTris) {
    this.bboxTris = {};

    this.bboxTris.corners = this.getBoundingBoxCorners();
    this.bboxTris.indices = [];

    var min = 0;
    var x = 1;
    var y = 2;
    var z = 3;

    var yz = 4;
    var xz = 5;
    var xy = 6;
    var max = 7;

    // front
    this.bboxTris.indices.push([min, xz, z]);
    this.bboxTris.indices.push([min, x, xz]);

    // back
    this.bboxTris.indices.push([max, y, yz]);
    this.bboxTris.indices.push([max, xy, y]);

    // left
    this.bboxTris.indices.push([min, z, yz]);
    this.bboxTris.indices.push([min, yz, y]);

    // right
    this.bboxTris.indices.push([max, xz, x]);
    this.bboxTris.indices.push([max, x, xy]);

    // top
    this.bboxTris.indices.push([max, yz, z]);
    this.bboxTris.indices.push([max, z, xz]);

    // bottom
    this.bboxTris.indices.push([min, y, xy]);
    this.bboxTris.indices.push([min, xy, x]);
  }

  return this.bboxTris;
};
