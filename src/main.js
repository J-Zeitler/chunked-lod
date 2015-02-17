"use strict";

require([
    "libs/text!shaders/example.vert",
    "libs/text!shaders/example.frag",
    "libs/text!shaders/simplex-noise.glsl",
    "libs/tileNode",
    "libs/chunkedPlane",
    "libs/orbit-controls"
],

function (exampleVert, exampleFrag, simplexNoise) {
  var camera, controls, renderer, scene;
  var rendererStats;
  var chunkedPlane;
  var t = new Date();

  init();
  animate();

  function init() {
    camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 2);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    scene = new THREE.Scene();

    chunkedPlane = new ChunkedPlane({
      scale: 1,
      tileRes: 8,
      camera: camera
    });

    scene.add(chunkedPlane);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor(0x222222, 1);

    console.log(renderer);
    console.log(camera);

    controls = new THREE.OrbitControls(camera);
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

    chunkedPlane.update();

    rendererStats.update(renderer);
    renderer.render(scene, camera);
    controls.update();
    requestAnimationFrame(animate);
  }
});
