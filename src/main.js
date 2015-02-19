"use strict";

require([
    "libs/vendor/text!shaders/tile.vert",
    "libs/vendor/text!shaders/example.frag",
    "libs/vendor/text!shaders/simplex-noise.glsl",
    "libs/tileNode",
    "libs/chunkedPlane",
    "libs/chunkedCube",
    "libs/chunkedCubeSphere",
    "libs/coordinateAxes",
    "libs/vendor/orbit-controls"
],

function (tileVert, exampleFrag, simplexNoise) {
  var camera, controls, renderer, scene;
  var rendererStats;
  var coordinateAxes, chunkedCubeSphere;
  var t = new Date();

  var EARTH_RADIUS = 6371000;

  init();
  animate();

  function init() {
    camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.01, EARTH_RADIUS*5);
    camera.position.set(0, 0, EARTH_RADIUS*2);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    scene = new THREE.Scene();

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

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor(0x222222, 1);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera);

    rendererStats = new THREEx.RendererStats();
    rendererStats.domElement.style.position = 'absolute';
    rendererStats.domElement.style.left = '0px';
    rendererStats.domElement.style.bottom   = '0px';
    document.body.appendChild(rendererStats.domElement);
  }

  function updateCameraSpeed() {
    var camToOrigin = camera.position.length();
    var camToSurface = camToOrigin - EARTH_RADIUS*0.5;
    // console.log("camera to surface: ", camToSurface);

    var zoomSpeed = Math.abs(Math.atan(camToSurface/EARTH_RADIUS));

    controls.zoomSpeed = zoomSpeed;
    controls.rotateSpeed = zoomSpeed;
  }

  function animate() {
    var dt = new Date() - t;
    t = new Date();

    chunkedCubeSphere.update();

    rendererStats.update(renderer);
    renderer.render(scene, camera);

    updateCameraSpeed();
    controls.update();

    requestAnimationFrame(animate);
  }
});
