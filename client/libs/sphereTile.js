var SphereTile = function (opts) {
  opts = opts || {};

  this.anchor = opts.anchor;
  this.extent = opts.extent;
  this.parent = opts.parent;
  this.master = opts.master;
  this.level = opts.level;
  this.ulrichFactor = opts.ulrichFactor;
  this.tileProvider = opts.tileProvider;
  this.alignToParent = opts.alignToParent || null;


  this.col = opts.col || 0;
  this.row = opts.row || 0;

  this.loading = false;
  this.visible = true;
  this.ready = false;

  // Default tex alignment -> use full texture
  this.texAnchor = new THREE.Vector2(0, 0);
  this.texExtent = 1;

  this.scale = this.master.getScale()/Math.pow(2, this.level);

  this.anchorPhi = this.anchor.x + Math.PI; // (-PI, PI) to (0, 2*PI)
  this.anchorTheta = Math.PI*0.5 - this.anchor.y; // (PI/2, -PI/2) to (0, PI)

  this.calculateCorners();

  this.visibleAreaCovered = false;

  this.center = this.getCenter();

  this.id = this.getId();
};

/////////////////////
/// Updaters
/////////////////////

/**
 * Check visibility, splitting and merging
 */
SphereTile.prototype.update = function () {
  this.updateTextureAlignment();

  this.visible = this.isVisible();
  if (this.visible) {
    if (this.shouldSplit()) {
      this.split();
      this.removeFromMaster();
      return this.update();
    } else if (this.shouldMerge()) {
      this.merge();
      this.addToMaster();
      return this.update();
    } else if (!this.added && !this.isSplit) {
      this.addToMaster();
    } else if (!this.ready && !this.isSplit) {
      this.requestNewTexture();
    }

    var childrenReady = false;
    if (this.isSplit && this.updateChildren()) {
      childrenReady = true;
      this.removeTexture();
    }

  } else {
    this.removeFromMaster();
    this.removeTexture();
  }

  return !this.visible || this.ready || childrenReady;
};

/**
 * Update children and return if they cover the _visible_ area of this
 */
SphereTile.prototype.updateChildren = function () {
  var blDone = this.bottomLeft.update();
  var brDone = this.bottomRight.update();
  var tlDone = this.topLeft.update();
  var trDone = this.topRight.update();
  return blDone && brDone && tlDone && trDone;
};

SphereTile.prototype.updateTextureAlignment = function () {
  var prevExt = this.texExtent;
  if (this.parent && !this.ready) {
    this.texAnchor = this.parent.texAnchor.clone().add(this.alignToParent.multiplyScalar(this.parent.texExtent));
    this.texExtent = this.parent.texExtent*0.5;
  } else { // reset to default
    this.texAnchor.x = 0;
    this.texAnchor.y = 0;
    this.texExtent = 1;
  }

  if (prevExt != this.texExtent) {
    this.master.updateTileTexture(this);
  }
};

/////////////////////
/// Geometry
/////////////////////

SphereTile.prototype.getGeometry = function () {
  if (this.geometry) return this.geometry;

  this.geometry = new THREE.BufferGeometry();
  var res = this.master.getTileRes();

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

SphereTile.prototype.getBoundingBox = function () {
  return this.getGeometry().boundingBox;
};

SphereTile.prototype.getBoundingBoxCorners = function () {
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

SphereTile.prototype.getBoundingBoxTriangles = function () {
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

SphereTile.prototype.calculateCorners = function () {
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

SphereTile.prototype.getCornersDeg = function () {
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

SphereTile.prototype.isVisible = function () {
  return this.isInFrustum() && this.isWithinHorizon();
};

SphereTile.prototype.isInFrustum = function () {
  return this.master.isTileInFrustum(this);
}

/**
 * Plane test horizon culling:
 * http://cesiumjs.org/2013/04/25/Horizon-culling/
 */
SphereTile.prototype.isWithinHorizon = function () {
  var r = this.master.getRadius();
  var camToTile = this.master.getCamToTile(this);
  var camToCenter = this.master.getCamToCenter();

  var camDistToCenter = camToCenter.length();
  var dotCtCc = camToTile.dot(camToCenter.divideScalar(camDistToCenter));

  return dotCtCc - this.scale*0.5 < (camDistToCenter - r*r/camDistToCenter);
};

/////////////////////
/// Utils
/////////////////////

SphereTile.prototype.getDistance = function () {
  return this.master.getDistanceToTile(this);
};

SphereTile.prototype.getCenter = function () {
  if (this.center) return this.center.clone();

  var centerPhi = this.anchorPhi + this.extent*0.5;
  var centerTheta = this.anchorTheta + this.extent*0.5;

  return MathUtils.polarToCartesian(centerPhi, centerTheta, this.master.getRadius());
};

SphereTile.prototype.getId = function () {
  if (this.id) return this.id;

  var id = this.center.x + ":" + this.center.y + ":" + this.center.z;
  return id;
};

/**
 * Return true if all children have finished loading (sorry for murdering english)
 * @return Boolean
 */
SphereTile.prototype.isChildrenAdded = function () {
  if (this.isSplit) {
    var blDone = this.bottomLeft.added || !this.bottomLeft.visible;
    var brDone = this.bottomRight.added || !this.bottomRight.visible;
    var tlDone = this.topLeft.added || !this.topLeft.visible;
    var trDone = this.topRight.added || !this.topRight.visible;
    return blDone && brDone && tlDone && trDone;
  }
  return false;
};

/////////////////////
/// Split/Merge
/////////////////////

SphereTile.prototype.shouldMerge = function () {
  if (this.isSplit) return this.level > 0 && SphereTile.SPLIT_TOLERANCE >= this.getScreenSpaceError();
  return false;
};

SphereTile.prototype.shouldSplit = function () {
  if (this.isSplit) return false;
  return this.level < this.master.getMaxLodLevel() && SphereTile.SPLIT_TOLERANCE < this.getScreenSpaceError();
};

SphereTile.prototype.getScreenSpaceError = function () {
  var visibleArea = this.master.getBoundingBoxVisibleArea(this);
  return visibleArea*SphereTile.SPLIT_FACTOR;
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
SphereTile.prototype.split = function () {
  if (this.isSplit) return;

  var nextExtent = this.extent*0.5;

  /**
   * TODO: Continue researching how to modify splitting near poles
   */
  var centerLat = this.anchor.y + this.extent*0.5;
  var x = centerLat/Math.PI;
  var ulrichModifier = Math.pow(Math.E, -12.5*x*x);
  // console.log("mod: ", ulrichModifier);

  // Shared opts
  var opts = {
    extent: nextExtent,
    parent: this,
    master: this.master,
    level: this.level + 1,
    ulrichFactor: this.ulrichFactor*0.5, //*ulrichModifier,
    tileProvider: this.tileProvider
  }

  // TL
  opts.anchor = this.anchor.clone();
  opts.alignToParent = new THREE.Vector2(0, 0);
  this.topLeft = new SphereTile(opts);

  // TR
  opts.anchor = new THREE.Vector2(this.anchor.x + nextExtent, this.anchor.y);
  opts.alignToParent = new THREE.Vector2(0.5, 0);
  this.topRight = new SphereTile(opts);

  // BL
  opts.anchor = new THREE.Vector2(this.anchor.x, this.anchor.y - nextExtent);
  opts.alignToParent = new THREE.Vector2(0, 0.5);
  this.bottomLeft = new SphereTile(opts);

  // BR
  opts.anchor = new THREE.Vector2(this.anchor.x + nextExtent, this.anchor.y - nextExtent);
  opts.alignToParent = new THREE.Vector2(0.5, 0.5);
  this.bottomRight = new SphereTile(opts);

  this.isSplit = true;
};

/**
 * Collapse this tile into a leaf node
 * TODO: Children get stuck in limbo if they haven't finished loading
 */
SphereTile.prototype.merge = function () {
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

SphereTile.prototype.addToMaster = function () {
  this.added = true;
  this.master.addTile(this);
  if (this.parent) {
    this.texture = this.parent.texture;
  }
};

SphereTile.prototype.requestNewTexture = function () {
  if (this.loading) return;

  this.loading = true;
  this.tileProvider.requestTile(this, function (texture) {
    this.loading = false;
    if (!texture) return;

    this.texture = texture;
    this.ready = true;
    this.updateTextureAlignment();

    // if (this.isOrphan() || this.isSplit) {
    //   // do not add
    // } else {
    //   this.ready = true;
    // }
  }, this);
};

SphereTile.prototype.isOrphan = function () {
  // adults cannot be orphaned
  if (this.parent === null) {
    return false;
  }

  var hasParent = this.parent && this.parent.isSplit;

  if (!hasParent) {
    return true;
  }

  var isOrphan = this !== this.parent.topRight &&
                 this !== this.parent.bottomRight &&
                 this !== this.parent.topLeft &&
                 this !== this.parent.bottomLeft;

  return isOrphan;
};

/**
 * Attempt to remove this tile from the render list
 * TODO: ensure remove is successful
 */
SphereTile.prototype.removeFromMaster = function () {
  this.master.removeTile(this);
  this.added = false;
};

SphereTile.prototype.removeTexture = function () {
  if (this.texture) {
    this.texture.dispose();
    this.ready = false;
    this.texture = undefined;
  }
};

/**
 * Remove and collapse this tile
 */
SphereTile.prototype.destroy = function () {
  if (this.isSplit) {
    this.merge();
  }
  this.removeFromMaster();
  this.removeTexture();
};

/////////////////////
/// Static
/////////////////////

SphereTile.SPLIT_FACTOR = 2.0;
SphereTile.SPLIT_TOLERANCE = 1.0;
