#version 330

#include "../../headers/post_processing_header.glsl"
#include "../../fb_lib/generative/random.glsl"
#include "../../couleurs_lib/grain.glsl"

#define GAUSSIANBLUR1D_SAMPLER_FNC(POS_UV) texture(tex, POS_UV)
#include "../../fb_lib/filter/gaussianBlur/1D.glsl"

uniform int u_blurKernelSize;
uniform float u_blurRadius;
uniform float u_grainAmount;

void main() {
  vec4 color = texture( u_texInput, vTexCoord0 );
  float blurRadius = u_blurRadius + 0. * snoise( vTexCoord0 + u_time );
  color = gaussianBlur1D( u_texInput, vTexCoord0, vec2( 0., blurRadius / u_resolution.y ), u_blurKernelSize );

  // Grain v1
  vec4 grain_1 = vec4( vec3( random( vTexCoord0 ) ), 1. );
  // oColor = color + random * .03;

  // Grain v2
  vec4 grain_2 = vec4( vec3( grain( vTexCoord0, u_resolution / 2.5, u_time / 2., 2.5 ) ), 1. );

  vec4 grain = grain_2;
  oColor = color + grain * u_grainAmount;
}
