#version 330

#include "../../headers/post_processing_header.glsl"

#define CHROMAAB_SAMPLER_FNC(POS_UV) texture(tex,POS_UV)
#include "../../fb_lib/fx/chromaAB.glsl"

#include "../../fb_lib/space/rotate.glsl"
#include "../../fb_lib/math/const.glsl"

#include "../../couleurs_lib/snoise.glsl"

uniform float u_chromaAmount;
uniform float u_chromaSpeed;

void main() {
  vec4 color = texture( u_texInput, vTexCoord0 );
  vec2 direction = rotate( vec2( 1. ), u_time * u_chromaSpeed, vec2( .5 ) + 0. * vec2( snoise( vTexCoord0 ) ) );
  float sdf = dot( vTexCoord0 - .5, vTexCoord0 - .5 );
  vec3 c = chromaAB( u_texInput, vTexCoord0, direction * sdf * 2.5, u_chromaAmount );
  oColor = vec4( c, 1. );
}
