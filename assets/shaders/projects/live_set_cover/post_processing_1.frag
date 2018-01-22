#version 330

#include "../../headers/post_processing_header.glsl"

#define GAUSSIANBLUR1D_SAMPLER_FNC(POS_UV) texture(tex, POS_UV)
#include "../../fb_lib/filter/gaussianBlur/1D.glsl"

void main() {
  // oColor = texture( u_texInput, vTexCoord0 );
  // float blurRadius = u_blurRadius + 0. * snoise( vTexCoord0 + u_time );
  oColor = gaussianBlur1D( u_texInput, vTexCoord0, vec2( 0., 3. / u_resolution.y ), 1 );
  vec4 newColor = lut( oColor, u_texLUT );
  oColor = mix( oColor, newColor, u_lutMix );

}
