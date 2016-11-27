#version 330

uniform float u_mix_amount;
uniform float u_sharpness;
uniform float u_radius;
uniform vec2 u_resolution;
uniform sampler2D inputTexture;

in vec2 vTexCoord0;

out vec4 oColor;

void main() {
  vec2 position = vTexCoord0 - vec2( .5 );
  position.x *= u_resolution.x / u_resolution.y;
  float len = length( position );
  vec4 inputColor = texture( inputTexture, vTexCoord0 );
  float mask = smoothstep( u_radius, u_sharpness, len);
  vec4 maskColor = vec4( inputColor.rgb * mask, 1. );
  oColor = mix( inputColor, maskColor, u_mix_amount );
}
