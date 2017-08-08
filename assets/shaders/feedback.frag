#version 330

// uniform vec2 u_resolution;
// uniform float mix_amount;
uniform sampler2D sourceTexture;
uniform sampler2D feedbackTexture;

in vec2 vTexCoord0;

out vec4 oColor;

vec2 scaleCentered(vec2 uv, float scale) {
  return ((uv - .5) * scale) + .5;
}

void main() {
  vec4 source = texture( sourceTexture, vTexCoord0 );
  vec4 feedback = texture( feedbackTexture, scaleCentered( vTexCoord0, 1. ) );
  oColor = mix(source, feedback, .9);
  // oColor = feedback;
}
