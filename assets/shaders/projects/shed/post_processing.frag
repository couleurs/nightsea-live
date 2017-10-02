#version 330

#include "../../headers/post_processing_header.glsl"
#include "../../fb_lib/generative/random.glsl"
#include "../../fb_lib/space/scale.glsl"

uniform sampler2D u_texColors_1;
uniform sampler2D u_texColors_2;
uniform float     u_colorMix;
uniform float     u_randomDisplacement;

void main() {
  // Random edges
  vec2 r = vec2(random( vTexCoord0 ), random( vTexCoord0 * 10. ) ) * 2. - 1.;
  vec4 color = texture( u_texInput, vTexCoord0 + u_randomDisplacement * r );

  // Color palette
  vec4 newColor = mix( lut( color, u_texColors_1 ), lut( color, u_texColors_2 ), 0. );

  // LUT
  newColor = lut( newColor, u_texLUT );
	oColor = mix( color, newColor, u_mixAmount );

  // Saturation
  oColor = vec4( mix( oColor.rgb, vec3( .5 ), .15 ), 1. );

  // Grain
  // float grain = random( ( scale ) )
  // oColor = r.x * .02 + oColor;
}
