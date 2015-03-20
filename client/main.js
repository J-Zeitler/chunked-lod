"use strict";

var updateLod = true;

require([
    "libs/vendor/text!shaders/tile.vert",
    "libs/vendor/text!shaders/tile.frag",
    "libs/vendor/text!shaders/simplex-noise.glsl",
    "libs/scissTileLoader",
    "libs/tileProvider",
    "libs/spherePatch",
    "libs/spherePatchGeometry",
    "libs/lodSphere",
    "libs/coordinateAxes",
    "libs/vendor/orbitControls",
    "libs/customTrackballControls",
    "libs/planetControls"
],

function (tileVert, tileFrag, simplexNoise) {
  var camera, controls, renderer, scene;
  var rendererStats;
  var coordinateAxes, lodSphere;

  var EARTH_RADIUS = MathUtils.EARTH_RADIUS;

  init();
  animate();

  function init() {
    System.logSystemInfo();

    /**
     * Scene + camera
     */
    camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.0001*EARTH_RADIUS, EARTH_RADIUS*100);
    camera.position.set(-EARTH_RADIUS*2, -EARTH_RADIUS*2, EARTH_RADIUS*2);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.up.set(0, 0, 1);

    scene = new THREE.Scene();

    THREE.ImageUtils.crossOrigin = '';
    var wmsProvider = new ScissWMSProvider();
    var imageLoader = new ScissTileLoader({
      wmsProvider: wmsProvider,
      layer: 'Earth_Global_Mosaic_Pan_Sharpened'
    });
    var imageProvider = new TileProvider({
      tileLoader: imageLoader
    });
    var terrainLoader = new ScissTileLoader({
      wmsProvider: wmsProvider,
      layer: 'Earth_heightmap'
    });
    var terrainProvider = new TileProvider({
      tileLoader: terrainLoader,
      noFilter: true
    });

    /**
     * Scene objects
     */
    lodSphere = new THREE.LODSphere({
      radius: EARTH_RADIUS,
      patchRes: 32,
      camera: camera,
      shaders: {
        vert: tileVert,
        frag: tileFrag
      },
      imageProvider: imageProvider,
      terrainProvider: terrainProvider
    });

    wmsProvider.onReady(function () {
      lodSphere.init();
      scene.add(lodSphere);
    });

    coordinateAxes = new CoordinateAxes({ scale: EARTH_RADIUS*3 });
    scene.add(coordinateAxes);

    /**
     * Camera controls
     */
    controls = new THREE.PlanetControls({
      camera: camera,
      planet: lodSphere
    });

    /**
     * Renderer
     */
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor(0x222222, 1);
    document.body.appendChild(renderer.domElement);

    rendererStats = new THREEx.RendererStats();
    rendererStats.domElement.style.position = 'absolute';
    rendererStats.domElement.style.left = '0px';
    rendererStats.domElement.style.bottom   = '0px';
    document.body.appendChild(rendererStats.domElement);
  }

  function animate() {
    if (updateLod) {
      lodSphere.update();
    }

    rendererStats.update(renderer, lodSphere);
    renderer.render(scene, camera);

    controls.update();

    requestAnimationFrame(animate);
  }
});
