var SpherePatch = function (opts) {
  opts = opts || {};

  this.anchor = opts.anchor;
  this.extent = opts.extent;
  this.parent = opts.parent;
  this.master = opts.master;
  this.level = opts.level;

  this.tileProvider = opts.tileProvider;
  this.terrainProvider = opts.terrainProvider;

  this.parentAlign = opts.parentAlign || new THREE.Vector2(0, 0);

  // Defaults
  this.visible = true;
  this.imageLoading = false;
  this.imageReady = false;
  this.terrainLoading = false;
  this.terrainReady = false;
  this.terrainLevel = -1;

  // Default texture alignment -> default use full texture
  this.texAnchor = new THREE.Vector2(0, 0);
  this.texExtent = 1;

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
      if (levelsToLeaf > SpherePatch.TERRAIN_START_DEPTH && !this.terrainReady) {
        this.requestNewTerrain();
      }
    }
  }

  this.visible = this.isVisible();
  if (this.visible) {
    // Look for new terrain
    if (this.getTerrainFromAncestor()) {
      this.master.uppdatePatchTerrain(this);
    }

    if (this.shouldSplit()) {
      this.split();
    } else if (this.shouldMerge()) {
      if (!this.imageReady) {
        this.requestNewTexture();
      }
      this.onReady(function () {
        this.merge();
        this.addToMaster();
      }, this);
    } else if (this.imageReady && !this.isSplit && !this.added) {
      this.addToMaster();
    } else if (!this.imageReady && levelsToLeaf < SpherePatch.REDUNDANCY_DEPTH) {
      this.requestNewTexture();
    }
  } else {
    this.removeFromMaster();
    this.removeTexture();
  }

  return {
    covered: !this.visible || this.imageReady || childrenReady,
    leafsReady: leafsReady || (!this.isSplit && (this.imageReady || !this.visible)),
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

SpherePatch.prototype.updateTextureAlignment = function () {
  var prevExt = this.texExtent;
  if (this.parent && !this.terrainReady) {
    this.texAnchor = this.parent.texAnchor.clone().add(this.parentAlign.clone().multiplyScalar(this.parent.texExtent));
    this.texExtent = this.parent.texExtent*0.5;
  } else { // reset to default
    this.texAnchor.x = 0;
    this.texAnchor.y = 0;
    this.texExtent = 1;
  }

  if (prevExt != this.texExtent) {
    this.master.uppdatePatchTerrain(this);
  }
};

/////////////////////
/// Hooks
/////////////////////

SpherePatch.prototype.onReady = function (fn, ctx) {
  this._onReadyTasks.push({fn: fn, ctx: ctx});

  if (this.imageReady) {
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

  this.bboxCorners.push(new THREE.Vector3(max.x, min.y, min.z)); // 1, x
  this.bboxCorners.push(new THREE.Vector3(min.x, max.y, min.z)); // 2, y
  this.bboxCorners.push(new THREE.Vector3(min.x, min.y, max.z)); // 3, z

  this.bboxCorners.push(new THREE.Vector3(min.x, max.y, max.z)); // 4, yz
  this.bboxCorners.push(new THREE.Vector3(max.x, min.y, max.z)); // 5, xz
  this.bboxCorners.push(new THREE.Vector3(max.x, max.y, min.z)); // 6, xy

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
  if (this.isSplit) return SpherePatch.SPLIT_TOLERANCE >= this.getScreenSpaceError();
  return false;
};

SpherePatch.prototype.shouldSplit = function () {
  if (this.isSplit) return false;
  return this.level < this.master.getMaxLodLevel() - 1 && SpherePatch.SPLIT_TOLERANCE < this.getScreenSpaceError();
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
    tileProvider: this.tileProvider,
    terrainProvider: this.terrainProvider
  }

  // TL
  opts.anchor = this.anchor.clone();
  opts.parentAlign = new THREE.Vector2(0, 0.5);
  this.topLeft = new SpherePatch(opts);

  // TR
  opts.anchor = new THREE.Vector2(this.anchor.x + nextExtent, this.anchor.y);
  opts.parentAlign = new THREE.Vector2(0.5, 0.5);
  this.topRight = new SpherePatch(opts);

  // BL
  opts.anchor = new THREE.Vector2(this.anchor.x, this.anchor.y - nextExtent);
  opts.parentAlign = new THREE.Vector2(0, 0);
  this.bottomLeft = new SpherePatch(opts);

  // BR
  opts.anchor = new THREE.Vector2(this.anchor.x + nextExtent, this.anchor.y - nextExtent);
  opts.parentAlign = new THREE.Vector2(0.5, 0);
  this.bottomRight = new SpherePatch(opts);

  this.isSplit = true;
};

/**
 * Collapse this tile into a leaf node
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
/// Textures
/////////////////////

SpherePatch.prototype.requestNewTexture = function () {
  if (this.imageLoading) return;

  this.imageLoading = true;
  this.tileProvider.requestTile(this, function (texture) {
    this.imageLoading = false;
    if (!texture) return;

    this.texture = texture;
    this.imageReady = true;
    this._onReadyNotify();
  }, this);
};

SpherePatch.prototype.requestNewTerrain = function () {
  if (this.terrainLoading) return;

  this.terrainLoading = true;
  this.terrainProvider.requestTile(this, function (texture) {
    this.terrainLoading = false;
    if (!texture) return;

    this.terrain = texture;
    this.terrainReady = true;
  }, this);
};

SpherePatch.prototype.getTerrainFromAncestor = function () {
  var ancestor = this;
  var texAnchor = new THREE.Vector2(0, 0);
  var texExtent = 1;
  while (!ancestor.terrainReady) {
    texExtent *= 0.5;
    texAnchor.multiplyScalar(0.5).add(ancestor.parentAlign);
    ancestor = ancestor.parent;
    if (!ancestor) return false;
  }

  this.terrain = ancestor.terrain;
  this.texAnchor = texAnchor;
  this.texExtent = texExtent;
};

SpherePatch.prototype.removeTexture = function () {
  if (this.texture) {
    this.texture.dispose();
    this.imageReady = false;
    this.texture = undefined;
  }
};

SpherePatch.prototype.removeTerrain = function () {
  if (this.terrain) {
    this.terrain.dispose();
    this.terrainReady = false;
    this.terrain = undefined;
  }
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

SpherePatch.prototype.removeFromMaster = function () {
  this.master.removePatch(this);
  this.added = false;
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
SpherePatch.TERRAIN_START_DEPTH = 3;
