#version 330

#include "../../headers/feedback_header.glsl"

void main() {
  vec4 source = texture( u_texSource, vTexCoord0 );
  vec4 feedback = texture( u_texFeedback, vTexCoord0 );
  oColor = mix( source, feedback, u_feedbackAmount );  
}
