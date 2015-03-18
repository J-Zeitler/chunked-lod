"use strict";

var updateLod = true;

require([
    "libs/vendor/text!shaders/tile.vert",
    "libs/vendor/text!shaders/tile.frag",
    "libs/vendor/text!shaders/simplex-noise.glsl",
    "mapboxSettings",
    "virtualEarthSettings",
    "onterraSettings",
    "libs/scissTileLoader",
    "libs/tileProvider",
    "libs/spherePatch",
    "libs/chunkedECPSphere",
    "libs/coordinateAxes",
    "libs/vendor/orbitControls",
    "libs/planetControls"
],

function (tileVert, tileFrag, simplexNoise) {
  var camera, controls, renderer, scene;
  var rendererStats;
  var coordinateAxes, lodSphere;
  var raycaster;

  var t = new Date();
  var EARTH_RADIUS = MathUtils.EARTH_RADIUS;

  init();
  animate();

  function init() {
    System.logSystemInfo();

    /**
     * Scene + camera
     */
    camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.00001*EARTH_RADIUS, EARTH_RADIUS*100);
    camera.position.set(-EARTH_RADIUS*2, -EARTH_RADIUS*2, EARTH_RADIUS*2);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

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
    lodSphere = new ChunkedECPSphere({
      radius: EARTH_RADIUS,
      patchRes: 32,
      camera: camera,
      shaders: {
        vert: tileVert,
        frag: tileFrag
      },
      tileProvider: imageProvider,
      terrainProvider: terrainProvider
    });

    wmsProvider.onReady(function () {
      lodSphere.init();
      scene.add(lodSphere);
    });

    coordinateAxes = new CoordinateAxes({ scale: EARTH_RADIUS*3 });
    scene.add(coordinateAxes);

    var geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    var material = new THREE.MeshBasicMaterial({color: 0x00ff00});
    var cube = new THREE.Mesh(geometry, material);
    cube.visible = false;
    scene.add(cube);

    /**
     * Camera controls
     */
    controls = new PlanetControls({
      camera: camera,
      planetRadius: EARTH_RADIUS,
      cube: cube
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
    var dt = new Date() - t;
    t = new Date();

    if (updateLod) {
      lodSphere.update();
    }

    rendererStats.update(renderer, lodSphere);
    renderer.render(scene, camera);

    controls.update();

    requestAnimationFrame(animate);
  }
});
