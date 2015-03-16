var SpherePatch = function (opts) {
  opts = opts || {};

  this.anchor = opts.anchor;
  this.extent = opts.extent;
  this.parent = opts.parent;
  this.master = opts.master;
  this.level = opts.level;
  this.tileProvider = opts.tileProvider;
  this.terrainProvider = opts.terrainProvider;

  // Defaults
  this.loading = false;
  this.visible = true;
  this.ready = false;

  this._onReadyTasks = [];

  this.scale = this.master.getScale()/Math.pow(2, this.level);

  // (lon,lat) to (φ,θ)
  this.anchorPhi = this.anchor.x + Math.PI; // [-π, π) to [0, 2*π)
  this.anchorTheta = Math.PI*0.5 - this.anchor.y; // [π/2, -π/2] to [0, π]

  this.calculateCorners();
  this.center = this.getCenter();
  this.id = this.getId();

  this.requestNewTexture();
};

/////////////////////
/// Updaters
/////////////////////

SpherePatch.prototype.update = function () {
  var childrenReady = false;
  var levelsToLeaf = 0;
  var leafsReady = false;
  if (this.isSplit) {
    var updateInfo = this.updateChildren();
    levelsToLeaf = updateInfo.levelsToLeaf;
    leafsReady = updateInfo.leafsReady;
    if (leafsReady) {
      childrenReady = true;
      this.removeFromMaster();

      if (levelsToLeaf > SpherePatch.REDUNDANCY_DEPTH) {
        this.removeTexture();
      }
    }
  }

  this.visible = this.isVisible();
  if (this.visible) {
    if (this.shouldSplit()) {
      this.split();
    } else if (this.shouldMerge()) {
      if (!this.ready) {
        this.requestNewTexture();
      }
      this.onReady(function () {
        this.merge();
        this.addToMaster();
      }, this);
    } else if (this.ready && !this.isSplit && !this.added) {
      this.addToMaster();
    } else if (!this.ready && levelsToLeaf < SpherePatch.REDUNDANCY_DEPTH) {
      this.requestNewTexture();
    }
  } else {
    this.removeFromMaster();
    this.removeTexture();
  }

  return {
    covered: !this.visible || this.ready || childrenReady,
    leafsReady: leafsReady || (!this.isSplit && (this.ready || !this.visible)),
    levelsToLeaf: levelsToLeaf
  };
};

/**
 * Update children and return if they cover the _visible_ area of this
 */
SpherePatch.prototype.updateChildren = function () {
  var bl = this.bottomLeft.update();
  var br = this.bottomRight.update();
  var tl = this.topLeft.update();
  var tr = this.topRight.update();

  var levelsToLeaf = MathUtils.maxDefined(bl.levelsToLeaf, br.levelsToLeaf, tl.levelsToLeaf, tr.levelsToLeaf) || 0;

  return {
    covered: bl.covered && br.covered && tl.covered && tr.covered,
    levelsToLeaf: 1 + levelsToLeaf,
    leafsReady: bl.leafsReady && br.leafsReady && tl.leafsReady && tr.leafsReady
  };
};

/////////////////////
/// Hooks
/////////////////////

SpherePatch.prototype.onReady = function (fn, ctx) {
  this._onReadyTasks.push({fn: fn, ctx: ctx});

  if (this.ready) {
    this._onReadyNotify();
  }
};

/**
 * Notify subscribers. Each subscriber is called _once_ and is then removed
 */
SpherePatch.prototype._onReadyNotify = function () {
  this._onReadyTasks.forEach(function (task) {
    task.fn.call(task.ctx);
  });

  this._onReadyTasks = [];
};

/////////////////////
/// Geometry
/////////////////////

SpherePatch.prototype.getGeometry = function () {
  if (this.geometry) return this.geometry;

  this.geometry = new THREE.BufferGeometry();
  var res = this.master.getPatchRes();

  // Positions + uvs
  var resMinus1 = res - 1;
  var scale = this.extent/resMinus1;
  var positions = new Float32Array(res*res*3);
  var uvs = new Float32Array(res*res*2);
  for (var y = 0; y < res; y++) {
    for (var x = 0; x < res; x++) {
      var posOffset = (y*res + x)*3;
      var phi = this.anchorPhi + x*scale;
      var theta = this.anchorTheta + y*scale;

      if (phi > 2.0*Math.PI) {
        phi = 2.0*Math.PI;
      }
      if (theta > Math.PI) {
        theta = Math.PI;
      }

      var pos = MathUtils.polarToCartesian(phi, theta, this.master.getRadius());

      positions[posOffset] = pos.x;
      positions[posOffset + 1] = pos.y;
      positions[posOffset + 2] = pos.z;

      var uvOffset = (y*res + x)*2;
      uvs[uvOffset] = x/resMinus1;
      uvs[uvOffset + 1] = 1 - y/resMinus1;
    }
  }

  // Indices
  var segs = (res - 1)*(res - 1);
  var indexData = [];
  for (var y = 0; y < (res - 1); y++) {
    for (var x = 1; x < res; x++) {
      var i = y*res + x;

      var self = i;
      var down = i + res;
      var left = i - 1;
      var leftDown = left + res;

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

  this.geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
  this.geometry.addAttribute('index', new THREE.BufferAttribute(indices, 1));
  this.geometry.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));

  this.geometry.computeBoundingBox();
  return this.geometry;
};

SpherePatch.prototype.getBoundingBox = function () {
  return this.getGeometry().boundingBox;
};

SpherePatch.prototype.getBoundingBoxCorners = function () {
  if (this.bboxCorners) return this.bboxCorners;

  this.bboxCorners = [];
  var bbox = this.getBoundingBox();

  var min = bbox.min.clone();
  var max = bbox.max.clone();

  this.bboxCorners.push(min); // 0

  this.bboxCorners.push(new THREE.Vector3(max.x, min.y, min.z)); // 1, minMaxX
  this.bboxCorners.push(new THREE.Vector3(min.x, max.y, min.z)); // 2, minMaxY
  this.bboxCorners.push(new THREE.Vector3(min.x, min.y, max.z)); // 3, minMaxZ

  this.bboxCorners.push(new THREE.Vector3(min.x, max.y, max.z)); // 4, maxMinX
  this.bboxCorners.push(new THREE.Vector3(max.x, min.y, max.z)); // 5, maxMinY
  this.bboxCorners.push(new THREE.Vector3(max.x, max.y, min.z)); // 6, maxMinZ

  this.bboxCorners.push(max); // 7

  return this.bboxCorners;
};

SpherePatch.prototype.getBoundingBoxTriangles = function () {
  if (this.bboxTris) return this.bboxTris;

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

  return this.bboxTris;
};

SpherePatch.prototype.calculateCorners = function () {
  var r = this.master.getRadius();
  this.corners = [
    MathUtils.polarToCartesian(this.anchorPhi, this.anchorTheta + this.extent, r), // BL
    MathUtils.polarToCartesian(this.anchorPhi + this.extent, this.anchorTheta + this.extent, r), // BR
    MathUtils.polarToCartesian(this.anchorPhi, this.anchorTheta, r), // TL
    MathUtils.polarToCartesian(this.anchorPhi + this.extent, this.anchorTheta, r) // TR
  ];

  this.SWNE = [
    this.anchor.clone().add(new THREE.Vector2(0, -this.extent)),
    this.anchor.clone().add(new THREE.Vector2(this.extent, 0))
  ];
};

SpherePatch.prototype.getCornersDeg = function () {
  var degSWNE = [
    new THREE.Vector2(
      MathUtils.radToDeg(this.SWNE[0].x),
      MathUtils.radToDeg(this.SWNE[0].y)
    ),
    new THREE.Vector2(
      MathUtils.radToDeg(this.SWNE[1].x),
      MathUtils.radToDeg(this.SWNE[1].y)
    )
  ];

  return degSWNE;
};

/////////////////////
/// Visibility
/////////////////////

SpherePatch.prototype.isVisible = function () {
  return this.isInFrustum() && this.isWithinHorizon();
};

SpherePatch.prototype.isInFrustum = function () {
  return this.master.isPatchInFrustum(this);
}

/**
 * Plane test horizon culling:
 * http://cesiumjs.org/2013/04/25/Horizon-culling/
 */
SpherePatch.prototype.isWithinHorizon = function () {
  var r = this.master.getRadius();
  var camToTile = this.master.getCamToPatch(this);
  var camToCenter = this.master.getCamToCenter();

  var camDistToCenter = camToCenter.length();
  var dotCtCc = camToTile.dot(camToCenter.divideScalar(camDistToCenter));

  return dotCtCc - this.scale*0.5 < (camDistToCenter - r*r/camDistToCenter);
};

/////////////////////
/// Utils
/////////////////////

SpherePatch.prototype.getCenter = function () {
  if (this.center) return this.center.clone();

  var centerPhi = this.anchorPhi + this.extent*0.5;
  var centerTheta = this.anchorTheta + this.extent*0.5;

  return MathUtils.polarToCartesian(centerPhi, centerTheta, this.master.getRadius());
};

SpherePatch.prototype.getId = function () {
  if (this.id) return this.id;

  var id = this.center.x + ":" + this.center.y + ":" + this.center.z;
  return id;
};

/////////////////////
/// Split/Merge
/////////////////////

SpherePatch.prototype.shouldMerge = function () {
  if (this.isSplit) return this.level > 0 && SpherePatch.SPLIT_TOLERANCE >= this.getScreenSpaceError();
  return false;
};

SpherePatch.prototype.shouldSplit = function () {
  if (this.isSplit) return false;
  return this.level < this.master.getMaxLodLevel() && SpherePatch.SPLIT_TOLERANCE < this.getScreenSpaceError();
};

SpherePatch.prototype.getScreenSpaceError = function () {
  var visibleArea = this.master.getBoundingBoxVisibleArea(this);
  return visibleArea*SpherePatch.SPLIT_FACTOR;
};

/**
 * Split this tile into four sub-tiles
 *
 *    +----+----+
 *    | TL | TR |
 *    +----+----+
 *    | BL | BR |
 *    +----+----+
 */
SpherePatch.prototype.split = function () {
  if (this.isSplit) return;

  var nextExtent = this.extent*0.5;

  // Shared opts
  var opts = {
    extent: nextExtent,
    parent: this,
    master: this.master,
    level: this.level + 1,
    tileProvider: this.tileProvider
  }

  // TL
  opts.anchor = this.anchor.clone();
  this.topLeft = new SpherePatch(opts);

  // TR
  opts.anchor = new THREE.Vector2(this.anchor.x + nextExtent, this.anchor.y);
  this.topRight = new SpherePatch(opts);

  // BL
  opts.anchor = new THREE.Vector2(this.anchor.x, this.anchor.y - nextExtent);
  this.bottomLeft = new SpherePatch(opts);

  // BR
  opts.anchor = new THREE.Vector2(this.anchor.x + nextExtent, this.anchor.y - nextExtent);
  this.bottomRight = new SpherePatch(opts);

  this.isSplit = true;
};

/**
 * Collapse this tile into a leaf node
 * TODO: Children get stuck in limbo if they haven't finished loading
 */
SpherePatch.prototype.merge = function () {
  if (this.isSplit) {
    this.bottomLeft.destroy();
    this.bottomRight.destroy();
    this.topLeft.destroy();
    this.topRight.destroy();

    delete this.bottomLeft;
    delete this.bottomRight;
    delete this.topLeft;
    delete this.topRight;
  }

  this.isSplit = false;
};

/////////////////////
/// Attach
/////////////////////

SpherePatch.prototype.addToMaster = function () {
  if (!this.added && !this.isSplit && this.visible) {
    this.added = true;
    this.master.addPatch(this);
  }
};

SpherePatch.prototype.addChildren = function () {
  this.bottomLeft.addToMaster();
  this.bottomRight.addToMaster();
  this.topLeft.addToMaster();
  this.topRight.addToMaster();
};

SpherePatch.prototype.requestNewTexture = function () {
  if (this.loading) return;

  this.loading = true;
  this.tileProvider.requestTile(this, function (texture) {
    this.loading = false;
    if (!texture) return;

    this.texture = texture;
    this.ready = true;
    this._onReadyNotify();
  }, this);
};

SpherePatch.prototype.removeFromMaster = function () {
  this.master.removePatch(this);
  this.added = false;
};

SpherePatch.prototype.removeTexture = function () {
  if (this.texture) {
    this.texture.dispose();
    this.ready = false;
    this.texture = undefined;
  }
};

/**
 * Remove and collapse this tile
 */
SpherePatch.prototype.destroy = function () {
  if (this.isSplit) {
    this.merge();
  }
  this.removeFromMaster();
  this.removeTexture();
};

/////////////////////
/// Static
/////////////////////

SpherePatch.SPLIT_FACTOR = 2.0;
SpherePatch.SPLIT_TOLERANCE = 1.0;

// How many levels above the leafs should a patch keep their texture?
SpherePatch.REDUNDANCY_DEPTH = 4;
