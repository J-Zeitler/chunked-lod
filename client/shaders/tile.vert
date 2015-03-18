precision mediump float;

uniform sampler2D terrain;
uniform int useTerrain;

uniform vec2 texAnchor;
uniform float texExtent;

varying vec2 uVu;

#define MAX_MAP_VALUE 65536.0
#define MAX_HEIGHT 32767.0
void main() {
  uVu = uv;

  vec3 pos = position;

  vec2 terrainUV = texAnchor + texExtent*uv;

  if (useTerrain == 1) {
    float height = texture2D(terrain, terrainUV).r;
    float signShift = step(0.50001, height);
    height -= signShift;
    height *= 2.0;

    vec3 heightOffset = MAX_MAP_VALUE*height*normalize(position);
    pos += heightOffset;
  }

  gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(pos, 1.0);
}
