precision mediump float;

uniform float level;
uniform sampler2D texMap;

varying vec3 pos;

#define PI 3.14159265359
#define divPI 0.31830988618
void main() {
  // vec3 unitPos = normalize(pos);

  // vec2 uv = vec2(
  //   (atan(unitPos.z, -unitPos.x)*divPI + 1.0)*0.5,
  //   acos(-unitPos.y)*divPI
  // );

  // gl_FragColor = texture2D(texMap, uv);

  gl_FragColor = vec4(sin(level), cos(level) + 0.1, sin(level*999999.0) + 0.5, 1.0);
}
