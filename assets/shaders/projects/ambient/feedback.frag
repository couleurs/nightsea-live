#version 330

#include "../../headers/feedback_header.glsl"
#include "../../fb_lib/space/scale.glsl"
#include "../../fb_lib/color/space/rgb2hsv.glsl"
#include "../../fb_lib/color/space/hsv2rgb.glsl"
#include "../../couleurs_lib/snoise.glsl"

void main() {
  vec4 source = texture( u_texSource, vTexCoord0 );
  vec2 st = vTexCoord0 + .1 * vec2(snoise(vec2(vTexCoord0.x, u_time / 5.)), snoise(vec2(vTexCoord0.y, u_time / 10.)));
  vec4 feedback = texture( u_texFeedback, scale( st, u_feedbackScale ) );
  vec4 f_hsv = rgb2hsv(feedback);
  // f_hsv.r +=  .3;
  // f_hsv.r = fract(f_hsv.r);
  vec4 f_rgb = hsv2rgb(f_hsv);
  // f_rgb.r += u_time / 20.;
  // f_rgb.r = fract(f_rgb.r);
  // f_rgb += 1.;
  oColor = mix( source, f_rgb, u_feedbackAmount );
  // oColor = source;
}
