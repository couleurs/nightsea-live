#version 330

#include "../../headers/post_processing_header.glsl"

#define GAUSSIANBLUR1D_SAMPLER_FNC(POS_UV) texture(tex, POS_UV)
#include "../../fb_lib/filter/gaussianBlur/1D.glsl"

#include "../../fb_lib/color/luma.glsl"

uniform sampler2D u_texColors;

void main() {
  vec4 color = texture( u_texInput, vTexCoord0 );
  oColor = gaussianBlur1D( u_texInput, vTexCoord0, vec2( 1. / u_resolution.x, 0. ), 1 );
  float l = luma(oColor);
  l = smoothstep(.0, .7, 1. - l);
  oColor = vec4(vec3(l), 1.);
  // oColor = lut( oColor, u_texColors );
  // oColor = mix( color, newColor, u_lutMix );
}
