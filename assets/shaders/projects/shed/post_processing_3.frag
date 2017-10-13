#version 330

#include "../../headers/post_processing_header.glsl"

#define CHROMA_SAMPLER_FNC(POS_UV) texture(tex,POS_UV)
#define CHROMA_ABERRATION_PCT 60.
// #define CHROMA_ABERRATION_DIST sdf * 2.5
#define CHROMA_ABERRATION_DIST sdf
#include "../../fb_lib/fx/chromaAB.glsl"

#include "../../fb_lib/space/rotate.glsl"
#include "../../fb_lib/math/const.glsl"

uniform float u_grainAmount;

void main() {
  vec4 color = texture( u_texInput, vTexCoord0 );
  vec2 direction = rotate( vec2( 1. ), u_time * 2., vec2(.5) );
  float sdf = dot( vTexCoord0 - .5, vTexCoord0 - .5 );
  vec3 c = chromaAB( u_texInput, vTexCoord0, direction * sdf * 2.5, 60.);
  oColor = vec4( c, 1. );
}
