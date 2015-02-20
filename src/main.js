"use strict";

var updateLod = true;

require([
    "libs/vendor/text!shaders/tile.vert",
    "libs/vendor/text!shaders/example.frag",
    "libs/vendor/text!shaders/simplex-noise.glsl",
    "libs/tileNode",
    "libs/chunkedPlane",
    "libs/chunkedCube",
    "libs/chunkedCubeSphere",
    "libs/coordinateAxes",
    "libs/vendor/orbitControls",
    "libs/planetControls"
],

function (tileVert, exampleFrag, simplexNoise) {
  var camera, controls, renderer, scene;
  var rendererStats;
  var coordinateAxes, chunkedCubeSphere;
  var raycaster;

  var t = new Date();
  var EARTH_RADIUS = 1; //6371000;

  init();
  animate();

  function init() {
    System.logSystemInfo();

    /**
     * Scene + camera
     */
    camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.00001*EARTH_RADIUS, EARTH_RADIUS*5);
    camera.position.set(0, 0, EARTH_RADIUS*2);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    scene = new THREE.Scene();

    /**
     * Scene objects
     */
    chunkedCubeSphere = new ChunkedCubeSphere({
      scale: EARTH_RADIUS,
      tileRes: 8,
      camera: camera,
      shaders: {
        vert: tileVert,
        frag: exampleFrag
      }
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
    // controls = new THREE.OrbitControls(camera);
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

  function updateCameraSpeed() {
    var camToOrigin = camera.position.length();
    var camToSurface = camToOrigin - EARTH_RADIUS;
    // console.log("camera to surface: ", camToSurface);

    var zoomSpeed = Math.abs(Math.atan(camToSurface/EARTH_RADIUS));

    controls.setZoomSpeed(zoomSpeed);
    controls.setRotateSpeed(zoomSpeed);
  }

  function animate() {
    var dt = new Date() - t;
    t = new Date();

    if (updateLod) {
      chunkedCubeSphere.update();
    }

    rendererStats.update(renderer);
    renderer.render(scene, camera);

    // updateCameraSpeed();
    controls.update();

    requestAnimationFrame(animate);
  }
});
