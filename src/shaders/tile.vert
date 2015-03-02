precision mediump float;

uniform sampler2D heightmap;
uniform float worldScale;

void main() {
  gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(position, 1.0);
}
