precision mediump float;

uniform sampler2D terrain;
uniform int useTerrain;

uniform vec2 texAnchor;
uniform float texExtent;
uniform vec2 terrainDims;

attribute vec2 phiTheta;

varying vec2 uVu;
varying vec2 phiThetaLerp;

#define MAX_MAP_VALUE 65536.0
#define MAX_HEIGHT 32767.0

#define PI 3.141592653589793
#define TWO_PI 6.283185307179586

float sampleCropped(sampler2D tex, vec2 uv) {
  float s = texture2D(tex, uv).r;
  float signShift = step(0.5, s);
  s -= signShift;
  s *= 2.0;

  return s;
}

float textureFetchLerp(sampler2D tex, vec2 uv) {
  vec2 uvScaled = uv*terrainDims;
  vec2 topLeft = floor(uvScaled);
  vec2 topRight = vec2(topLeft.x + 1.0, topLeft.y);
  vec2 bottomLeft = vec2(topLeft.x, topLeft.y + 1.0);
  vec2 bottomRight = vec2(topLeft.x + 1.0, topLeft.y + 1.0);

  vec2 t = (uvScaled - topLeft);

  float sTopLeft = sampleCropped(tex, topLeft/terrainDims);
  float sTopRight = sampleCropped(tex, topRight/terrainDims);
  float sBottomLeft = sampleCropped(tex, bottomLeft/terrainDims);
  float sBottomRight = sampleCropped(tex, bottomRight/terrainDims);

  // bilerp
  return (sTopLeft*(1.0 - t.x) + sTopRight*t.x)*(1.0 - t.y) +
         (sBottomLeft*(1.0 - t.x) + sBottomRight*t.x)*t.y;
}

void main() {
  uVu = uv;
  // flip y
  phiThetaLerp = vec2(phiTheta.x, PI - phiTheta.y);

  vec3 pos = position;

  vec2 terrainUV = texAnchor + texExtent*uv;

  if (useTerrain == 1) {
    float height = textureFetchLerp(terrain, terrainUV);

    vec3 heightOffset = MAX_MAP_VALUE*height*normalize(position);
    pos += heightOffset;
  }

  gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(pos, 1.0);
}
