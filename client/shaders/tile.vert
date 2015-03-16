precision mediump float;

uniform sampler2D tileTex;

varying vec2 uVu;

#define MAX_MAP_VALUE 65536.0
#define MAX_HEIGHT 32767.0
void main() {
  uVu = uv;

  float height = texture2D(tileTex, uVu).r;
  float signShift = step(MAX_HEIGHT, height);
  height -= signShift*MAX_MAP_VALUE;

  vec3 heightOffset = 499.0*height*normalize(position);
  vec3 modifiedPos = position + heightOffset;

  gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(modifiedPos, 1.0);
}
