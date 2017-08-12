#version 330

#include "../../headers/feedback_header.glsl"

#include "../../fb_lib/space/scale.glsl"

uniform float u_feedbackScale;

void main() {
  vec4 source = texture( u_texSource, vTexCoord0 );
  vec4 feedback = texture( u_texFeedback, scale( vTexCoord0, u_feedbackScale ) );
  oColor = mix(source, feedback, u_feedbackAmount);  
}
