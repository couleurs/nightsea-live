#version 330

#include "../../headers/common_header.glsl"
#include "../../fb_lib/space/ratio.glsl"
#include "../../fb_lib/math/map.glsl"
#include "../../fb_lib/easing/sine.glsl"
#include "../../couleurs_lib/snoise.glsl"

const float radius = 110.;

uniform int u_section;
uniform float u_smooth;
uniform float u_speed;
uniform float u_tickSensitivity;

float dist( vec2 pt ) {
  // return min(abs(pt.x+pt.y),abs(pt.x-pt.y))+0.001;
  // return abs(pt.x+pt.y);
  // return abs(pt.x)+abs(pt.y);
  // return max(abs(pt.x),abs(pt.y));
  // return abs(pt.x);
  return length( pt );
}

float noise( vec2 st ) {
  // Option 1
  // return snoise( st / 2. + u_time / 2. ) * .7;

  // Option 2
  // float n = snoise( vec2( st.x, u_time ) );
  // return step( .5, n );

  // Option 3
  float n = snoise( vec2( st.x * .1, u_time * .5 ) ) * .3;
  float delta = .5;// * abs( snoise( vec2( st.x ) ) );
  return 1. - smoothstep( n - delta, n + delta, st.y + .2 );
}

void main() {
  vec2 st = vTexCoord0;
  st = ratio( st, u_resolution );

  // Part 1: BEAST
  float localRadius = radius / u_resolution.x;
  localRadius *= map( sineInOut( u_tick ), 0., 1., 1. - u_tickSensitivity, 1. );

  float waveFactorR = sin( u_time * 1.07 - st.y * 15. * PI ) * .015;
  float waveFactorG = sin( u_time * 1.03 - st.y * 14. * PI)  * .01;
  float waveFactorB = sin( u_time * 1.05 - st.y * 14. * PI ) * .02;

  float r = 1. - smoothstep( localRadius - u_smooth / 2., localRadius * .9 + u_smooth / 2.,
                             distance( st, vec2( .5 + waveFactorR ) ) );
  float g = 1. - smoothstep( localRadius - u_smooth / 2., localRadius * 1.2 + u_smooth / 2.,
                             distance( st, vec2( .5175 ) + waveFactorG ) );
  float b = 1. - smoothstep( localRadius - u_smooth / 2., localRadius * 1.1 + u_smooth / 2.,
                             distance( st, vec2( .4675 ) + waveFactorG ) );
  vec4 color = vec4(r, mix(r, g, 1.), mix(r, b, 1.), 1.);

  // Part 2: ROAD
  st = st - vec2( .5 );
  float rInv = 1. / dist( st );
  st = st * rInv - vec2( rInv + u_time * u_speed * 100., 0. );
  float n = 1. - smoothstep( .15, .27, noise( st ) );
  vec4 noiseColor = vec4( vec3( n + ( .03 + sineInOut( u_tick ) * u_tickSensitivity ) * rInv ), 1. );

  oColor = mix(color, noiseColor, float(u_section));
}
