precision mediump float;

uniform float level;

void main() {
  gl_FragColor = vec4(sin(level), cos(1.0 - level*2.0), sin(level*999999.0) + 0.5, 1.0);
}
