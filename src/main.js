"use strict";

require([
    "libs/text!shaders/tile.vert",
    "libs/text!shaders/example.frag",
    "libs/text!shaders/simplex-noise.glsl",
    "libs/tileNode",
    "libs/chunkedPlane",
    "libs/chunkedCubeSphere",
    "libs/chunkedCube",
    "libs/orbit-controls"
],

function (tileVert, exampleFrag, simplexNoise) {
  var camera, controls, renderer, scene;
  var rendererStats;
  var chunkedCubeSphere;
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

    var axes = buildAxes(EARTH_RADIUS*3);
    scene.add(axes);


    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor(0x222222, 1);
    document.body.appendChild(renderer.domElement);

    // console.log(renderer);
    // console.log(camera);

    controls = new THREE.OrbitControls(camera);
    console.log(controls);

    rendererStats = new THREEx.RendererStats();
    rendererStats.domElement.style.position = 'absolute';
    rendererStats.domElement.style.left = '0px';
    rendererStats.domElement.style.bottom   = '0px';
    document.body.appendChild(rendererStats.domElement);
  }

  function updateCameraSpeed() {
    var camToOrigin = camera.position.length();
    var camToSurface = camToOrigin - EARTH_RADIUS*0.5;
    console.log("camera to surface: ", camToSurface);

    var zoomSpeed = Math.abs(Math.atan(camToSurface/EARTH_RADIUS));

    controls.zoomSpeed = zoomSpeed;
    controls.rotateSpeed = zoomSpeed;
  }

  var i = 0
  function animate() {
    var dt = new Date() - t;
    t = new Date();

    chunkedCubeSphere.update();

    rendererStats.update(renderer);
    renderer.render(scene, camera);

    updateCameraSpeed();
    controls.update();

    // if (i++ < 1000)
      requestAnimationFrame(animate);
  }

  function buildAxes( length ) {
    var axes = new THREE.Object3D();

    axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( length, 0, 0 ), 0xFF0000, false ) ); // +X
    axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( -length, 0, 0 ), 0xFF0000, true) ); // -X
    axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, length, 0 ), 0x00FF00, false ) ); // +Y
    axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, -length, 0 ), 0x00FF00, true ) ); // -Y
    axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, length ), 0x0000FF, false ) ); // +Z
    axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -length ), 0x0000FF, true ) ); // -Z

    return axes;
  }

  function buildAxis( src, dst, colorHex, dashed ) {
    var geom = new THREE.Geometry(),
        mat;

    if(dashed) {
      mat = new THREE.LineDashedMaterial({ linewidth: 1, color: colorHex, dashSize: 3, gapSize: 3 });
    } else {
      mat = new THREE.LineBasicMaterial({ linewidth: 1, color: colorHex });
    }

    geom.vertices.push( src.clone() );
    geom.vertices.push( dst.clone() );
    geom.computeLineDistances(); // This one is SUPER important, otherwise dashed lines will appear as simple plain lines

    var axis = new THREE.Line( geom, mat, THREE.LinePieces );

    return axis;
  }
});
