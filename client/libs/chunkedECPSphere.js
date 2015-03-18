var ChunkedECPSphere = function (opts) {
  THREE.Object3D.call(this);

  opts = opts || {};

  this.patchRes = opts.patchRes || 16;
  this.maxScreenSpaceError = opts.maxScreenSpaceError || 2;
  this.camera = opts.camera;
  this.radius = opts.radius || 1;
  this.maxLevels = opts.maxLevels || 32;

  this.texture = opts.texture; // Use a static texture
  this.tileProvider = opts.tileProvider // ... or dynamic ones
  this.terrainProvider = opts.terrainProvider;

  this.vertShader = opts.shaders.vert;
  this.fragShader = opts.shaders.frag;

  this.perspectiveScaling = 1;
  this.updatePerspectiveScaling();

  this.frustum = new THREE.Frustum();

  this.basePatches = [];

  this.cameraViewProjection = new THREE.Matrix4();
};

ChunkedECPSphere.prototype = Object.create(THREE.Object3D.prototype);

ChunkedECPSphere.prototype.init = function () {
  var layer = this.tileProvider.getActiveLayer();
  this.maxLevels = Math.min(layer.levels, this.maxLevels);

  var startLevel = -1;
  var baseRes = 360;
  while (baseRes > 90 && ++startLevel < layer.resolutions.length) {
    baseRes = layer.resolutions[startLevel].lat;
  }

  var baseResRad = MathUtils.degToRad(baseRes);

  for (var theta = Math.PI*0.5; theta > -Math.PI*0.5; theta -= baseResRad) {
    for (var phi = -Math.PI; phi < Math.PI; phi += baseResRad) {
      this.addBasePatch(new THREE.Vector2(phi, theta), baseResRad, startLevel);
    }
  }
};

ChunkedECPSphere.prototype.addBasePatch = function (anchor, extent, level) {
  var rootPatch = new SpherePatch({
    anchor: anchor,
    extent: extent,
    parent: null,
    master: this,
    level: level,
    tileProvider: this.tileProvider,
    terrainProvider: this.terrainProvider
  });

  this.basePatches.push(rootPatch);
};

ChunkedECPSphere.prototype.update = function () {
  this.camera.updateMatrix();
  this.camera.updateMatrixWorld();
  this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);

  this.updateCameraViewProjection();
  this.updatePerspectiveScaling();
  this.updateFrustum();
  this.calculateCameraWorldPosition();

  this.basePatches.forEach(function (rootPatch) {
    rootPatch.update();
  });
};

ChunkedECPSphere.prototype.addPatch = function (patch) {
  var selectedPatch = this.getObjectByName(patch.id);
  if (selectedPatch) return; // already added

  var patchGeometry = patch.getGeometry();

  var useTerrain = !!patch.terrain ? 1 : 0;
  var terrainDims = new THREE.Vector2(1, 1);
  if (useTerrain) {
    terrainDims.x = patch.terrain.image.width;
    terrainDims.y = patch.terrain.image.height;
  }

  var patchUniforms = {
    level: {type: 'f', value: patch.level},
    tileTex: {type: 't', value: patch.texture},
    terrain: {type: 't', value: patch.terrain},
    useTerrain: {type: 'i', value: useTerrain},
    terrainDims: {type: 'v2', value: terrainDims},
    texAnchor: {type: 'v2', value: patch.texAnchor},
    texExtent: {type: 'f', value: patch.texExtent}
    // opacity: {type: "f", value: 0.0}
  };

  var patchMaterial = new THREE.ShaderMaterial({
    uniforms: patchUniforms,
    vertexShader: this.vertShader,
    fragmentShader: this.fragShader,
    transparent: true
  });

  patchMaterial.wireframe = true;
  patchMaterial.wireframeLinewidth = 1.0;

  var patchMesh = new THREE.Mesh(
    patchGeometry,
    patchMaterial
  );

  patchMesh.name = patch.id;
  this.add(patchMesh);

  // var bbox = new THREE.BoundingBoxHelper(patchMesh, 0x00ffff);
  // bbox.update();
  // bbox.name = patch.id + 'bbox';
  // this.add(bbox);
};

ChunkedECPSphere.prototype.removePatch = function (patch) {
  var selectedPatch = this.getObjectByName(patch.id);
  if (selectedPatch) {
    selectedPatch.geometry.dispose();
    selectedPatch.material.dispose();
    this.remove(selectedPatch);
  }
  var patchBbox = this.getObjectByName(patch.id + 'bbox');
  if (patchBbox) {
    this.remove(patchBbox);
  }
};

ChunkedECPSphere.prototype.uppdatePatchTerrain = function (patch) {
  var selectedPatch = this.getObjectByName(patch.id);
  if (selectedPatch) {
    selectedPatch.material.uniforms.terrain.value = patch.terrain;
    selectedPatch.material.uniforms.useTerrain.value = !!patch.terrain ? 1 : 0;
    selectedPatch.material.uniforms.texAnchor.value = patch.texAnchor;
    selectedPatch.material.uniforms.texExtent.value = patch.texExtent;
  }
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

ChunkedECPSphere.prototype.getPatchRes = function () {
  return this.patchRes;
};

ChunkedECPSphere.prototype.calculateCameraWorldPosition = function () {
  this.camera.updateMatrix();
  this.cameraWorldPosition = this.camera.position.clone().applyMatrix4(this.camera.parent.matrix);
};

ChunkedECPSphere.prototype.getCameraPosition = function () {
  return this.cameraWorldPosition.clone();
};

ChunkedECPSphere.prototype.getDistanceToPatch = function (patch) {
  return patch.getBoundingBox().distanceToPoint(this.getCameraPosition());
};

ChunkedECPSphere.prototype.getCamToCenter = function () {
  return this.getCameraPosition().multiplyScalar(-1);
};

ChunkedECPSphere.prototype.isPatchInFrustum = function (patch) {
  var patchBoundingBox = patch.getBoundingBox();

  if (this.frustum.intersectsBox(patchBoundingBox)) return true;
  return false;
};

ChunkedECPSphere.prototype.getCamToPatch = function (patch) {
  var minDist = Infinity;
  var closestCorner = new THREE.Vector3();
  var camPos = this.getCameraPosition();

  patch.corners.forEach(function (corner) {
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

ChunkedECPSphere.prototype.getBoundingBoxVisibleArea = function (patch) {
  var bboxTris = patch.getBoundingBoxTriangles();

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
