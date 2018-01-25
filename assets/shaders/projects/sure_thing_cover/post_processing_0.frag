#version 330

#include "../../headers/post_processing_header.glsl"

#include "../../fb_lib/color/contrast.glsl"
#include "../../fb_lib/color/desaturate.glsl"
#include "../../couleurs_lib/grain.glsl"
#include "../../couleurs_lib/snoise.glsl"

uniform float u_grainAmount;
uniform float u_saturation;

void main() {
  vec4 color = texture( u_texInput, vTexCoord0 );

  vec4 grain = vec4( vec3( grain( vTexCoord0, u_resolution / 2.5, u_time / 2., 2.5 ) ), 1. );
  color += grain * u_grainAmount;

  vec4 newColor = lut( color, u_texLUT );
	oColor = mix( color, newColor, u_lutMix );

  oColor = contrast(oColor, 1.15);
  oColor = desaturate(oColor, mix(.25, -.75, u_saturation));
  // oColor = desaturate(oColor, .8);
  oColor += .02;
  // oColor = mix(oColor, vec4(1.), 0.02);

  // float n = snoise(vec3(vTexCoord0 * .7, u_time / 7.));
  // n = step(.4, n);
  // oColor = vec4(oColor.rgb * n, 1.);
  // n = smoothstep(.0, 1., n);
  // oColor = vec4(vec3(n), 1.);
}
