#include "../../headers/post_processing_header.glsl"

#include "../../fb_lib/color/contrast.glsl"
#include "../../fb_lib/color/desaturate.glsl"

#include "../../couleurs_lib/grain.glsl"
#include "../../couleurs_lib/snoise.glsl"

#include "../../fb_lib/space/ratio.glsl"
#include "../../fb_lib/space/scale.glsl"
#include "../../fb_lib/space/rotate.glsl"

#include "../../fb_lib/draw/rectSDF.glsl"

#include "../../fb_lib/math/const.glsl"

uniform float u_grainAmount;
uniform float u_saturation;

uniform sampler2D u_texColors;

void main() {
  vec3 color = texture(u_texInput, vTexCoord0).rgb;

  // Masking
  vec2 st = ratio(vTexCoord0, u_resolution);
  st = scale(st, 1.);
  // st -= vec2(.5);
  float speed = .02;
  // st += 1. * vec2(snoise(vec2(u_time * speed, 0.)), snoise(vec2(0., 17. + u_time * speed)));
  float l = 1. - clamp(smoothstep(.0, 1., length(st) * .9), 0., 1.);
  st.x += .25 * snoise(st * 1.5);
  l = 1. - smoothstep(-.0, 1.5, st.x - st.y + .2);
  // l = 1. - smoothstep(.4, .6, rectSDF(st, vec2(.8, 1.3)));
  // l = 1. - smoothstep(.5, .5, st.x - st.y + .2);
  // color = color * l;
  // vec2 uv = rotate(vTexCoord0, HALF_PI);
  // l = pow(clamp(mix(0., 1., uv.x * .5 + uv.y * .5 - .1), 0., 1.), .8);
  // color = vec3(l);

  vec3 grain = vec3( grain( vTexCoord0, u_resolution / 2.5, u_time / 2., 2.5 ) );
  color += grain * u_grainAmount;

  vec3 newColor = lut(color, u_texLUT);
	color = mix(color, newColor, u_lutMix);

  color = contrast(color, 1.15);
  color = desaturate(color, mix(.25, -.75, u_saturation));
  color += .02;

  oColor = vec4(color, 1.);
}
