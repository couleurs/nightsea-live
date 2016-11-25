#version 330

// uniform vec2 u_resolution;
// uniform float mix_amount;
uniform sampler2D sourceTexture;
uniform sampler2D feedbackTexture;

in vec2 vTexCoord0;

out vec4 oColor;

void main() {
  oColor = texture( sourceTexture, vTexCoord0 );  
}
