var SphereTile = function (opts) {
  opts = opts || {};

  this.anchor = opts.anchor;
  this.extent = opts.extent;
  this.parent = opts.parent;
  this.master = opts.master;
  this.level = opts.level;
  this.ulrichFactor = opts.ulrichFactor;
  this.tileLoader = opts.tileLoader;

  this.virtualEarthIndex = opts.virtualEarthIndex;

  // console.log(this.virtualEarthIndex);

  this.col = opts.col || 0;
  this.row = opts.row || 0;

  this.loading = false;
  this.visible = true;

  this.scale = this.master.getScale()/Math.pow(2, this.level);

  this.anchorPhi = this.anchor.x + Math.PI; // (-PI, PI) to (0, 2*PI)
  this.anchorTheta = Math.PI*0.5 - this.anchor.y; // (PI/2, -PI/2) to (0, PI)

  this.calculateCorners();

  this.center = this.getCenter();

  this.id = this.getId();
};

SphereTile.prototype.polarToCartesian = function (phi, theta) {
  var r = this.master.getRadius();

  return new THREE.Vector3(
    r*Math.sin(theta)*Math.cos(phi),
    r*Math.sin(theta)*Math.sin(phi),
    r*Math.cos(theta)
  );
};

SphereTile.prototype.radiansToDeg = function (rad) {
  return rad*180/Math.PI;
};

/**
 * Check visibility, splitting and merging
 */
SphereTile.prototype.update = function () {
   if (this.isVisible()) {
    if (this.shouldSplit()) {
      this.split();
      this.removeFromMaster();
      this.update();
    } else if (this.shouldMerge()) {
      this.merge();
      this.addToMaster();
      this.update();
    } else if (this.isSplit) {
      this.updateChildren();
    } else if (!this.added) {
      this.addToMaster();
    }
  } else if (this.isSplit) {
    // TODO: revisit this
    this.updateChildren();
  } else {
    this.removeFromMaster();
  }
};

SphereTile.prototype.updateChildren = function () {
  this.bottomLeft.update();
  this.bottomRight.update();
  this.topLeft.update();
  this.topRight.update();
};

SphereTile.prototype.getGeometry = function () {
  if (this.geometry) return this.geometry;

  this.geometry = new THREE.BufferGeometry();
  var res = this.master.getTileRes();

  // Positions
  var resMinus1 = res - 1;
  var scale = this.extent/resMinus1;
  var positions = new Float32Array(res*res*3);
  var uvs = new Float32Array(res*res*2);
  for (var y = 0; y < res; y++) {
    for (var x = 0; x < res; x++) {
      var posOffset = (y*res + x)*3;
      var phi = this.anchorPhi + x*scale;
      var theta = this.anchorTheta - y*scale;

      var pos = this.polarToCartesian(phi, theta);

      positions[posOffset] = pos.x;
      positions[posOffset + 1] = pos.y;
      positions[posOffset + 2] = pos.z;

      var uvOffset = (y*res + x)*2;
      uvs[uvOffset] = x/resMinus1;
      uvs[uvOffset + 1] = y/resMinus1;
    }
  }

  // console.log(uvs);

  // Indices
  var segs = (res - 1)*(res - 1);
  var indexData = [];
  for (var y = 0; y < (res - 1); y++) {
    for (var x = 1; x < res; x++) {
      var i = y*res + x;

      var self = i;
      var up = i + res;
      var left = i - 1;
      var leftUp = left + res;

      // top left
      indexData.push(left);
      indexData.push(up);
      indexData.push(leftUp);

      // bottom right
      indexData.push(left);
      indexData.push(self);
      indexData.push(up);
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

SphereTile.prototype.calculateCorners = function () {
  this.corners = [
    this.polarToCartesian(this.anchorPhi, this.anchorTheta), // BL
    this.polarToCartesian(this.anchorPhi + this.extent, this.anchorTheta), // BR
    this.polarToCartesian(this.anchorPhi, this.anchorTheta - this.extent), // TL
    this.polarToCartesian(this.anchorPhi + this.extent, this.anchorTheta - this.extent) // TR
  ];

  this.SWNE = [
    this.anchor.clone(),
    this.anchor.clone().addScalar(this.extent)
  ];
};

SphereTile.prototype.getCornersDeg = function () {
  var degSWNE = [
    new THREE.Vector2(
      this.radiansToDeg(this.SWNE[0].x),
      this.radiansToDeg(this.SWNE[0].y)
    ),
    new THREE.Vector2(
      this.radiansToDeg(this.SWNE[1].x),
      this.radiansToDeg(this.SWNE[1].y)
    )
  ];

  return degSWNE;
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

SphereTile.prototype.getDistance = function () {
  return this.master.getDistanceToTile(this);
};

/**
 * Get the center point of this tile
 */
SphereTile.prototype.getCenter = function () {
  if (this.center) return this.center.clone();

  var centerPhi = this.anchorPhi + this.extent*0.5;
  var centerTheta = this.anchorTheta + this.extent*0.5;

  return this.polarToCartesian(centerPhi, centerTheta);
};

SphereTile.prototype.getId = function () {
  if (this.id) return this.id;

  var id = this.center.x + ":" + this.center.y + ":" + this.center.z;
  return id;
};

SphereTile.prototype.shouldMerge = function () {
  if (this.isSplit) return this.level > 0 && this.master.getMaxScreenSpaceError() >= this.getScreenSpaceError();
  return false;
};

SphereTile.prototype.shouldSplit = function () {
  if (this.isSplit) return false;
  return this.level < this.master.getMaxLodLevel() && this.master.getMaxScreenSpaceError() < this.getScreenSpaceError();
};

SphereTile.prototype.getScreenSpaceError = function () {
  return this.master.getPerspectiveScaling()*this.ulrichFactor/this.getDistance();
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
    tileLoader: this.tileLoader
  }

  var nextCol = this.col*2;
  var nextRow = this.row*2;

  // BL
  opts.anchor = this.anchor.clone();
  opts.col = nextCol;
  opts.row = nextRow + 1;
  opts.virtualEarthIndex = {
    top: this.virtualEarthIndex.bottom + '0',
    bottom: this.virtualEarthIndex.bottom + '2'
  };
  this.bottomLeft = new SphereTile(opts);

  // BR
  opts.anchor = new THREE.Vector2(this.anchor.x + nextExtent, this.anchor.y);
  opts.col = nextCol + 1;
  opts.row = nextRow + 1;
  opts.virtualEarthIndex = {
    top: this.virtualEarthIndex.bottom + '1',
    bottom: this.virtualEarthIndex.bottom + '3'
  };
  this.bottomRight = new SphereTile(opts);

  // TL
  opts.anchor = new THREE.Vector2(this.anchor.x, this.anchor.y + nextExtent);
  opts.col = nextCol;
  opts.row = nextRow;
  opts.virtualEarthIndex = {
    top: this.virtualEarthIndex.top + '0',
    bottom: this.virtualEarthIndex.top + '2'
  };
  this.topLeft = new SphereTile(opts);

  // TR
  opts.anchor = new THREE.Vector2(this.anchor.x + nextExtent, this.anchor.y + nextExtent);
  opts.col = nextCol + 1;
  opts.row = nextRow;
  opts.virtualEarthIndex = {
    top: this.virtualEarthIndex.top + '1',
    bottom: this.virtualEarthIndex.top + '3'
  };
  this.topRight = new SphereTile(opts);

  this.isSplit = true;
};

/**
 * Collapse this tile into a leaf node
 * TODO: Children get stuck in limbo, causing z-fighting, if they haven't finished loading
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

SphereTile.prototype.addToMaster = function () {
  this.loading = true;
  var texUrl = this.tileLoader.loadTileTexture(this, function (image) {
    if (image) {
      this.texture = THREE.ImageUtils.loadTexture(image);

      this.master.addTile(this);
      this.added = true;
    }
    this.loading = false;
  }, this);
  // this.master.addTile(this);
  // this.added = true;
};

/**
 * Attempt to remove this tile from the render list
 * TODO: ensure remove is successful
 */
SphereTile.prototype.removeFromMaster = function () {
  this.tileLoader.abortLoading(this);
  this.master.removeTile(this);
  this.added = false;
};

/**
 * Remove and collapse this tile
 */
SphereTile.prototype.destroy = function () {
  if (this.isSplit) {
    this.merge();
  } else {
    this.removeFromMaster();
  }
};
