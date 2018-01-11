#version 330

#include "../../headers/post_processing_header.glsl"

void main() {
  vec4 color = texture( u_texInput, vTexCoord0 );
  vec4 newColor = lut( color, u_texLUT );
	oColor = mix( color, newColor, u_lutMix );  
}
