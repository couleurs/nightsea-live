#version 330

#include "../../headers/post_processing_header.glsl"

#define CHROMAAB_SAMPLER_FNC(POS_UV) texture(tex,POS_UV)
#include "../../fb_lib/fx/chromaAB.glsl"

#include "../../fb_lib/space/rotate.glsl"
#include "../../fb_lib/math/const.glsl"
#include "../../fb_lib/color/desaturate.glsl"
#include "../../fb_lib/color/contrast.glsl"

#include "../../couleurs_lib/snoise.glsl"

#include "../../fb_lib/color/levels/inputRange.glsl"
#include "../../fb_lib/color/levels/outputRange.glsl"

uniform float u_chromaAmount;
uniform float u_chromaSpeed;

void main() {
  vec4 color = texture( u_texInput, vTexCoord0 );
  vec2 direction = rotate( vec2( 1. ), u_time * u_chromaSpeed, vec2( .5 ) + 0. * vec2( snoise( vTexCoord0 ) ) );
  float sdf = dot( vTexCoord0 - .5, vTexCoord0 - .5 );
  vec3 c = chromaAB( u_texInput, vTexCoord0, direction * sdf * 2.5, u_chromaAmount );
  oColor = vec4( c, 1. );
  oColor = contrast(oColor, 1.1);
  oColor = desaturate(oColor, -.75);

  oColor.r = mix(0., oColor.r, 1.);
  oColor = levelsInputRange(oColor, vec3(0.), vec3(1., 1., .71));
  oColor = levelsOutputRange(oColor, vec3(0.25, 0., 0.), vec3(1., 1., 1.));

  oColor = desaturate(oColor, .0);
}
