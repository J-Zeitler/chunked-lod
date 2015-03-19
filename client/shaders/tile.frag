precision mediump float;

uniform float level;
uniform sampler2D tileTex;
uniform sampler2D fullTexture;

varying vec2 uVu;
varying vec2 phiThetaLerp;

#define PI 3.141592653589793
#define TWO_PI 6.283185307179586
void main() {
  gl_FragColor = texture2D(tileTex, uVu);

  // vec2 ptUV = phiThetaLerp/vec2(TWO_PI, PI);
  // gl_FragColor = texture2D(fullTexture, ptUV);

  // gl_FragColor = vec4(sin(level), cos(level) + 0.1, sin(level*999999.0) + 0.5, 1.0);
}
