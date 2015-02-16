"use strict";

require([
    "libs/text!shaders/example.vert",
    "libs/text!shaders/example.frag",
    "libs/text!shaders/simplex-noise.glsl",
    "libs/orbit-controls"
],

function (exampleVert, exampleFrag, simplexNoise) {
  var camera, controls, renderer, scene;
  var sphere, sphereUniforms, sphereMaterial;
  var t = new Date();

  init();
  animate();

  function init() {
    camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 3);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    scene = new THREE.Scene();

    sphereUniforms = {
        dt: {type: "f", value: 0.0}
    };

    sphereMaterial = new THREE.ShaderMaterial({
        uniforms: sphereUniforms,
        vertexShader: simplexNoise + exampleVert,
        fragmentShader: simplexNoise + exampleFrag
    });

    sphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.0, 200, 200),
        sphereMaterial
    );
    scene.add(sphere);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor(0x222222, 1);

    controls = new THREE.OrbitControls(camera);
    document.body.appendChild(renderer.domElement);
  }

  function animate() {
    var dt = new Date() - t;
    t = new Date();
    sphereUniforms.dt.value += dt;

    renderer.render(scene, camera);
    controls.update();
    requestAnimationFrame(animate);
  }
});
