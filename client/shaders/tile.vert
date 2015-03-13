precision mediump float;

uniform vec2 texAnchor;
uniform float texExtent;

varying vec2 uVu;

void main() {
  uVu = texAnchor + texExtent*uv;

  gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(position, 1.0);
}
