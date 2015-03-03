precision mediump float;

uniform sampler2D heightmap;
uniform float worldScale;

varying vec2 uVu;

void main() {
  uVu = uv;

  gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(position, 1.0);
}
