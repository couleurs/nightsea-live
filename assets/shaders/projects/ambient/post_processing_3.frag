#version 330

#include "../../headers/post_processing_header.glsl"

#define CHROMAAB_SAMPLER_FNC(POS_UV) texture(tex,POS_UV)
#include "../../fb_lib/fx/chromaAB.glsl"

#include "../../fb_lib/space/rotate.glsl"
#include "../../fb_lib/math/const.glsl"
#include "../../fb_lib/math/map.glsl"
#include "../../fb_lib/color/desaturate.glsl"
#include "../../fb_lib/color/contrast.glsl"

#include "../../couleurs_lib/snoise.glsl"

#include "../../fb_lib/color/levels/inputRange.glsl"
#include "../../fb_lib/color/levels/outputRange.glsl"

#include "../../fb_lib/color/space/rgb2hsv.glsl"
#include "../../fb_lib/color/space/hsv2rgb.glsl"

uniform float u_chromaAmount;
uniform float u_chromaSpeed;
uniform float u_sizeBeat;
uniform float u_redAmount;

void main() {
  vec2 direction = rotate( vec2( 1. ), u_time * u_chromaSpeed, vec2( .5 ) + 0. * vec2( snoise( vTexCoord0 ) ) );
  float sdf = dot( vTexCoord0 - .5, vTexCoord0 - .5 );
  vec2 st = vTexCoord0;// + .0 * vec2(snoise(vec2(vTexCoord0.x, u_time / 8.)), snoise(vec2(vTexCoord0.y, u_time / 10.)));
  float chroma_max = mix(2.5, 2.8, u_sizeBeat);
  vec3 c = chromaAB( u_texInput, st, direction * sdf * map(u_tick, 0., 1., 2.5, chroma_max), u_chromaAmount );
  oColor = vec4( c, 1. );
  // oColor = contrast(oColor, 1.1);
  oColor = desaturate(oColor, -.5);

  oColor.r = mix(0., oColor.r, 1.);
  oColor = levelsInputRange(oColor, vec3(0.), vec3(1., 1., .71));
  oColor = levelsOutputRange(oColor, vec3(.25, mix(-.5, 0.5, u_redAmount), 0.), vec3(1., 1., 1.));

  oColor = desaturate(oColor, -.0);
  oColor = mix(oColor, vec4(1.), .2);
}
