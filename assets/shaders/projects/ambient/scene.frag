#version 330

#include "../../headers/common_header.glsl"
#include "../../fb_lib/math/lengthSq.glsl"
// #define CIRCLESDF_FNC(POS_UV) lengthSq(POS_UV)
#include "../../fb_lib/draw/circleSDF.glsl"
#include "../../fb_lib/draw/stroke.glsl"
#include "../../fb_lib/draw/fill.glsl"
#include "../../fb_lib/space/scale.glsl"
#include "../../fb_lib/space/ratio.glsl"
#include "../../fb_lib/animation/easing/sine.glsl"
#include "../../fb_lib/fx/lensFlare.glsl"

void main() {
  vec2 st = ratio(vTexCoord0, u_resolution);
  float vignette = circleSDF(scale(st, mix(1., 1., sineInOut(u_tick))), (.0 * vec2(sin(u_time / 10.), cos(u_time / 10.)) + 1.) / 2.);
  // oColor = vec4(vec3(fill(vignette, .2)), 1.);
  oColor = vec4(vec3(vignette), 1.);
  // oColor.rgb += lensFlare(vTexCoord0, vec2(.1));
}
