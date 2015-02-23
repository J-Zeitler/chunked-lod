precision mediump float;

uniform sampler2D heightmap;
uniform float worldScale;

varying vec3 pos;
// varying vec2 uVu;

/**
 * cube2sphere from:
 * http://mathproofs.blogspot.se/2005/07/mapping-cube-to-sphere.html
 */
#define sqrt3 1.7320508075688772
vec3 cube2sphere(vec3 cube) {
  cube /= worldScale;

  float x2 = cube.x*cube.x;
  float y2 = cube.y*cube.y;
  float z2 = cube.z*cube.z;
  vec3 sphere = vec3(
    cube.x*sqrt(1.0 - y2*0.5 - z2*0.5 + y2*z2*0.3333333),
    cube.y*sqrt(1.0 - x2*0.5 - z2*0.5 + x2*z2*0.3333333),
    cube.z*sqrt(1.0 - x2*0.5 - y2*0.5 + x2*y2*0.3333333)
  );

  return sphere*worldScale*sqrt3;
}

void main() {
  // pos = position;
  // vec3 cubePos = (modelMatrix*vec4(pos, 1.0)).xyz;

  // // QuadCube projection
  // vec3 spherePos = cube2sphere(cubePos);
  // pos = spherePos;

  // gl_Position = projectionMatrix *
  //               viewMatrix *
  //               vec4(pos, 1.0);

  pos = (modelMatrix*vec4(position, 1.0)).xyz;

  /**
   * Pass thorugh
   */
  gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(position, 1.0);
}
