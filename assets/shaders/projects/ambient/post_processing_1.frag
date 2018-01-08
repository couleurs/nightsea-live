#version 330

#include "../../headers/post_processing_header.glsl"

#define GAUSSIANBLUR1D_SAMPLER_FNC(POS_UV) texture(tex, POS_UV)
#include "../../fb_lib/filter/gaussianBlur/1D.glsl"

uniform float u_blurRadius;

void main() {
  vec4 color = texture( u_texInput, vTexCoord0 );
  oColor = gaussianBlur1D( u_texInput, vTexCoord0, vec2( u_blurRadius / u_resolution.x, 0. ), 20 );
}
