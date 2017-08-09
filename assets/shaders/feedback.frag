#version 330

uniform sampler2D u_texSource;
uniform sampler2D u_texFeedback;

uniform float u_feedbackScale;
uniform float u_feedbackAmount;

in vec2 vTexCoord0;

out vec4 oColor;

vec2 scaleCentered(vec2 uv, float scale) {
  return ((uv - .5) * scale) + .5;
}

void main() {
  vec4 source = texture( u_texSource, vTexCoord0 );
  vec4 feedback = texture( u_texFeedback, scaleCentered( vTexCoord0, u_feedbackScale ) );
  oColor = mix(source, feedback, u_feedbackAmount);  
}
