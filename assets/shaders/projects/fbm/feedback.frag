#version 330

#include "../../headers/feedback_header.glsl"
#include "../../fb_lib/space/scale.glsl"

void main() {
  vec4 source = texture( u_texSource, vTexCoord0 );
  vec2 st = scale(vTexCoord0, u_feedbackScale);
  vec4 feedback = texture( u_texFeedback, st );
  oColor = mix( source, feedback, u_feedbackAmount );
}
