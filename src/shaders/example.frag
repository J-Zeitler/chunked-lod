precision mediump float;

uniform float dt;

varying float r;

void main() {
  gl_FragColor = vec4(10.0*(1.07 - r), 20.0*(0.98 - r), 25.0*(0.93 - r), 1.0);
}
