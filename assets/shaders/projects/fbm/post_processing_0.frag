#version 330

#include "../../headers/post_processing_header.glsl"
#include "../../couleurs_lib/grain.glsl"

uniform float u_grainAmount;

void main() {
  vec4 color = texture( u_texInput, vTexCoord0 );
  vec4 newColor = lut( color, u_texLUT );
	oColor = mix( color, newColor, u_lutMix );

  vec4 grain = vec4( vec3( grain( vTexCoord0, u_resolution / 2.5, u_time / 2., 2.5 ) ), 1. );
  oColor += grain * u_grainAmount;
}
