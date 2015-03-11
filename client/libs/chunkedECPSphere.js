var ChunkedECPSphere = function (opts) {
  THREE.Object3D.call(this);

  opts = opts || {};

  this.tileRes = opts.tileRes || 16;
  this.maxScreenSpaceError = opts.maxScreenSpaceError || 2;
  this.camera = opts.camera;
  this.radius = opts.radius || 1;
  this.maxLevels = opts.maxLevels || 32;

  this.texture = opts.texture; // Use a static texture
  this.tileLoader = opts.tileLoader // ... or dynamic ones

  this.vertShader = opts.shaders.vert;
  this.fragShader = opts.shaders.frag;

  this.perspectiveScaling = 1;
  this.updatePerspectiveScaling();

  this.frustum = new THREE.Frustum();

  this.baseTiles = [];
  this.initBaseTiles();

  this.cameraViewProjection = new THREE.Matrix4();
};

ChunkedECPSphere.prototype = Object.create(THREE.Object3D.prototype);

ChunkedECPSphere.prototype.initBaseTiles = function () {
  this.tileLoader.provider.onReady(function () {
    var activeLayer = this.tileLoader.layer;
    var layer = this.tileLoader.provider.getLayerByName(activeLayer);
    this.maxLevels = Math.min(layer.levels, this.maxLevels);
    var baseRes = layer.resolutions[0].lat;
    baseRes = baseRes*Math.PI/180; // to rad

    for (var theta = Math.PI*0.5; theta > -Math.PI*0.5; theta -= baseRes) {
      for (var phi = -Math.PI; phi < Math.PI; phi += baseRes) {
        this.addBaseTile(new THREE.Vector2(phi, theta), baseRes);
      }
    }
  }.bind(this));
};

ChunkedECPSphere.prototype.addBaseTile = function (anchor, extent) {
  var rootTile = new SphereTile({
    anchor: anchor,
    extent: extent,
    parent: null,
    master: this,
    level: 1,
    ulrichFactor: 0.004*this.radius,
    tileLoader: this.tileLoader
  });

  this.baseTiles.push(rootTile);
};

ChunkedECPSphere.prototype.update = function () {
  this.camera.updateMatrix();
  this.camera.updateMatrixWorld();
  this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);

  this.updateCameraViewProjection();
  this.updatePerspectiveScaling();
  this.updateFrustum();
  this.calculateCameraWorldPosition();

  this.baseTiles.forEach(function (rootTile) {
    rootTile.update();
  });
};

ChunkedECPSphere.prototype.addTile = function (tile) {
  // console.log("adding tile: " + tile.id);
  var selectedTile = this.getObjectByName(tile.id);
  if (selectedTile) return; // already added

  var tileGeometry = tile.getGeometry();

  // var topLeft = new THREE.Vector2(
  //   tile.position.x - tile.scale*0.5,
  //   tile.position.y + tile.scale*0.5
  // );

  var tileUniforms = {
    worldScale: {type: "f", value: this.scaleFactor*0.5},
    level: {type: "f", value: tile.level},
    tileTex: {type: "t", value: tile.texture},
    // topLeft: {type: "v2", value: topLeft},
    // tileScale: {type: "f", value: tile.scale},
    // opacity: {type: "f", value: 0.0}
  };

  var tileMaterial = new THREE.ShaderMaterial({
    uniforms: tileUniforms,
    vertexShader: this.vertShader,
    fragmentShader: this.fragShader,
    transparent: true,
    depthTest: false
  });

  // tileMaterial.wireframe = true;
  // tileMaterial.wireframeLinewidth = 1.0;

  var tileMesh = new THREE.Mesh(
    tileGeometry,
    tileMaterial
  );

  tileMesh.name = tile.id;
  this.add(tileMesh);

  // var bbox = new THREE.BoundingBoxHelper(tileMesh, 0x00ffff);
  // bbox.update();
  // bbox.name = tile.id + 'bbox';
  // this.add(bbox);

};

ChunkedECPSphere.prototype.removeTile = function (tile) {
  // var selectedTile = this.getObjectByName(tile.id);
  // if (selectedTile) {
  //   // Fade out and remove
  //   this._animateTileOpacity(selectedTile.material, -100, function () {
  //     if (tile.texture) {
  //       tile.texture.dispose();
  //     }
  //     selectedTile.geometry.dispose();
  //     selectedTile.material.dispose();
  //     this.remove(selectedTile);
  //   });
  // }

  var selectedTile = this.getObjectByName(tile.id);
  if (selectedTile) {
    if (tile.texture) {
      tile.texture.dispose();
    }
    selectedTile.geometry.dispose();
    selectedTile.material.dispose();
    this.remove(selectedTile);
  }
  var tileBbox = this.getObjectByName(tile.id + 'bbox');
  if (tileBbox) {
    this.remove(tileBbox);
  }
};

ChunkedECPSphere.prototype._animateTileOpacity = function (material, fadeTime, done) {
  var self = this;

  var toValue = fadeTime > 0 ? 1.0 : 0.0;
  var opacity = material.uniforms.opacity.value;

  var tweenOpacity = new TWEEN.Tween({opacity: opacity})
      .to({opacity: 1.0}, Math.abs(fadeTime))
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(function () {
        material.uniforms.opacity.value = this.opacity;
      })
      .onComplete(function () {
        if (typeof done === 'function') {
          done.call(self);
        }
      });
  tweenOpacity.start();
};

ChunkedECPSphere.prototype.getMaxScreenSpaceError = function () {
  return this.maxScreenSpaceError;
};

ChunkedECPSphere.prototype.getMaxLodLevel = function () {
  return this.maxLevels;
};

ChunkedECPSphere.prototype.getScale = function () {
  return this.radius*2;
};

ChunkedECPSphere.prototype.getRadius = function () {
  return this.radius;
};

ChunkedECPSphere.prototype.getTileRes = function () {
  return this.tileRes;
};

ChunkedECPSphere.prototype.calculateCameraWorldPosition = function () {
  this.camera.updateMatrix();
  this.cameraWorldPosition = this.camera.position.clone().applyMatrix4(this.camera.parent.matrix);
};

ChunkedECPSphere.prototype.getCameraPosition = function () {
  return this.cameraWorldPosition.clone();
};

ChunkedECPSphere.prototype.getDistanceToTile = function (tile) {
  // var minDist = Infinity;
  // var camPos = this.getCameraPosition();

  // tile.corners.forEach(function (corner) {
  //   var dist = camPos.distanceTo(corner);
  //   minDist = dist < minDist ? dist : minDist;
  // }, this);

  // return minDist;
  // var bboxGeo = new THREE.BoundingBoxHelper(tile.getBoundingBox());
  // console.log(tile.getBoundingBox());
  return tile.getBoundingBox().distanceToPoint(this.getCameraPosition());
};

ChunkedECPSphere.prototype.getCamToCenter = function () {
  return this.getCameraPosition().multiplyScalar(-1);
};

ChunkedECPSphere.prototype.isTileInFrustum = function (tile) {
  var tileBoundingBox = tile.getBoundingBox();

  if (this.frustum.intersectsBox(tileBoundingBox)) return true;
  return false;
};

ChunkedECPSphere.prototype.getCamToTile = function (tile) {
  var minDist = Infinity;
  var closestCorner = new THREE.Vector3();
  var camPos = this.getCameraPosition();

  tile.corners.forEach(function (corner) {
    var dist = camPos.distanceTo(corner);

    if (dist < minDist) {
      minDist = dist;
      closestCorner = corner;
    }
  }, this);

  return closestCorner.clone().sub(camPos);
};

ChunkedECPSphere.prototype.getPerspectiveScaling = function () {
  return this.perspectiveScaling;
};

ChunkedECPSphere.prototype.getBoundingBoxVisibleArea = function (tile) {
  var bboxTris = tile.getBoundingBoxTriangles();

  // Project to sphere around camera
  var n = new THREE.Vector3();
  var a = new THREE.Vector3();
  var b = new THREE.Vector3();
  var projectedTris = [];
  bboxTris.indices.forEach(function (triIndices) {
    var projectedVerts = [];
    triIndices.forEach(function (idx) {
      var p = bboxTris.corners[idx].clone();
      // to camera space
      p.applyMatrix4(this.camera.matrixWorldInverse);
      // to unit sphere around camera
      p.normalize();
      projectedVerts.push(p);
    }, this);

    a.subVectors(projectedVerts[1], projectedVerts[0]);
    b.subVectors(projectedVerts[2], projectedVerts[0]);
    n.crossVectors(a, b);

    // backface cull
    if (n.z < 0) {
      projectedTris.push(projectedVerts);
    }

  }, this);

  var triarea = function (a, b, c) {
    return 0.5*Math.abs(a.x*(b.y - c.y) + b.x*(c.y - a.y) + c.x*(a.y - b.y));
  };

  var visibleArea = 0;
  projectedTris.forEach(function (tri) {
    var meanX = (tri[0].x + tri[1].x + tri[2].x)/3;
    var meanY = (tri[0].y + tri[1].y + tri[2].y)/3;

    // -e^(-x^2-y^2)+2, domain: R^2, range: [1, 2)
    var unbiasMid = -Math.pow(Math.E, -meanX*meanX - meanY*meanY) + 2;

    visibleArea += triarea(tri[0], tri[1], tri[2]); //*unbiasMid;
  });

  return visibleArea;
};

/**
 * Calculate horizontal perspective scaling factor.
 * Divide by object dist to camera to get number of pixels per unit at that dist.
 */
ChunkedECPSphere.prototype.updatePerspectiveScaling = function () {
  var vFOV = this.camera.fov*Math.PI/180;
  var heightScale = 2*Math.tan(vFOV/2);
  var aspect = window.innerWidth/window.innerHeight;

  this.perspectiveScaling = window.innerWidth/(aspect*heightScale);
};

ChunkedECPSphere.prototype.updateCameraViewProjection = function () {
  this.cameraViewProjection.multiplyMatrices(
    this.camera.projectionMatrix,
    this.camera.matrixWorldInverse
  );
};

ChunkedECPSphere.prototype.updateFrustum = function () {
  this.frustum.setFromMatrix(this.cameraViewProjection);
};
