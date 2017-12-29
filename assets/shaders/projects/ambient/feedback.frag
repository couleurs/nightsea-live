#version 330

#include "../../headers/feedback_header.glsl"
#include "../../fb_lib/space/scale.glsl"
#include "../../fb_lib/color/space/rgb2hsv.glsl"
#include "../../fb_lib/color/space/hsv2rgb.glsl"

void main() {
  vec4 source = texture( u_texSource, vTexCoord0 );
  vec4 feedback = texture( u_texFeedback, scale( vTexCoord0, u_feedbackScale ) );
  // vec4 f_hsv = rgb2hsv(feedback);
  // f_hsv.b += u_time / 10.;
  // f_hsv.b = fract(f_hsv.b);
  // vec4 f_rgb = hsv2rgb(f_hsv);
  oColor = mix( source, feedback, u_feedbackAmount );
  // oColor = source;
}
