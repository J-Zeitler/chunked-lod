precision mediump float;

uniform float dt;

varying float r;

void main() {
  float noise  = 0.5*snoise(vec4(position*2.0, dt*0.0003));
        noise += 0.25*snoise(vec4(position*4.0, dt*0.0003));
        noise += 0.125*snoise(vec4(position*8.0, dt*0.0003));
        noise += 0.0625*snoise(vec4(position*16.0, dt*0.0003));

  vec3 displaced = position + position*0.3*noise;
  r = length(displaced);

  gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(displaced, 1.0);;
}
