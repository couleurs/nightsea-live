#version 330

// uniform vec2 u_resolution;
// uniform float mix_amount;
uniform sampler2D inputTexture;

in vec2 vTexCoord0;

out vec4 oColor;

void main() {
  oColor = texture( inputTexture, vTexCoord0 );
}
