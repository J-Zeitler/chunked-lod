"use strict";

var updateLod = true;

require([
    "libs/vendor/text!shaders/tile.vert",
    "libs/vendor/text!shaders/tile.frag",
    "libs/vendor/text!shaders/simplex-noise.glsl",
    "mapboxSettings",
    "virtualEarthSettings",
    "onterraSettings",
    "libs/tileLoader",
    "libs/tileNode",
    "libs/sphereTile",
    "libs/chunkedCubeSphere",
    "libs/chunkedECPSphere",
    "libs/coordinateAxes",
    "libs/vendor/orbitControls",
    "libs/planetControls"
],

function (tileVert, tileFrag, simplexNoise) {
  var camera, controls, renderer, scene;
  var rendererStats;
  var coordinateAxes, chunkedCubeSphere;
  var raycaster;

  var t = new Date();
  var EARTH_RADIUS = 6371000;

  init();
  animate();

  function init() {
    System.logSystemInfo();

    /**
     * Scene + camera
     */
    camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.00001*EARTH_RADIUS, EARTH_RADIUS*100);
    camera.position.set(0, 0, EARTH_RADIUS*2);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    scene = new THREE.Scene();

    var tileLoader = new TileLoader({
      service: virtualEarthSettings,
      layer: 'mapbox.outdoors'
    });

    /**
     * Scene objects
     */
    chunkedCubeSphere = new ChunkedECPSphere({
      radius: EARTH_RADIUS,
      tileRes: 16,
      camera: camera,
      shaders: {
        vert: tileVert,
        frag: tileFrag
      },
      tileLoader: tileLoader
    });
    scene.add(chunkedCubeSphere);

    coordinateAxes = new CoordinateAxes({ scale: EARTH_RADIUS*3 });
    scene.add(coordinateAxes);

    var geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    var material = new THREE.MeshBasicMaterial({color: 0x00ff00});
    var cube = new THREE.Mesh( geometry, material );
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
      chunkedCubeSphere.update();
    }

    rendererStats.update(renderer, chunkedCubeSphere);
    renderer.render(scene, camera);

    controls.update();

    requestAnimationFrame(animate);
  }
});
