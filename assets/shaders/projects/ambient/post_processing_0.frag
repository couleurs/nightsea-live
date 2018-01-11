#version 330

#include "../../headers/post_processing_header.glsl"
#include "../../fb_lib/generative/random.glsl"
#include "../../fb_lib/space/scale.glsl"

uniform sampler2D u_texColors;

void main() {
  // Random edges
  vec2 r = vec2(random( vTexCoord0 ), random( vTexCoord0 * 10. ) ) * 2. - 1.;
  vec4 color = texture( u_texInput, vTexCoord0 + .1 * r );

  // Color palette
  vec4 newColor = color;
  newColor = lut( color, u_texColors );

  // LUT
  newColor = lut( newColor, u_texLUT );
	oColor = mix( color, newColor, u_lutMix );

  // Saturation
  oColor = vec4( mix( oColor.rgb, vec3( .5 ), .15 ), 1. );
}
