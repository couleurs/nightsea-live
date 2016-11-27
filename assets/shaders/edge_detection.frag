#version 330

uniform vec2 u_resolution;
uniform float u_mix_amount;
uniform float u_threshold;
uniform sampler2D inputTexture;

in vec2 vTexCoord0;

out vec4 oColor;

// Adapted from http://coding-experiments.blogspot.com/2010/06/edge-detection.html
float threshold(in float thr1, in float thr2 , in float val) {
  if (val < thr1) {return 0.0;}
  if (val > thr2) {return 1.0;}
  return val;
}

// averaged pixel difference from 3 color channels
float diff(in vec4 pix1, in vec4 pix2) {
  return (
    abs(pix1.r - pix2.r) +
    abs(pix1.g - pix2.g) +
    abs(pix1.b - pix2.b)
  ) / 3.0;
}

float edge(in sampler2D tex, in vec2 coords, in vec2 renderSize){
  float dx = 1.0 / renderSize.x;
  float dy = 1.0 / renderSize.y;
  vec4 pix[9];

  pix[0] = texture(tex, coords + vec2( -1.0 * dx, -1.0 * dy));
  pix[1] = texture(tex, coords + vec2( -1.0 * dx , 0.0 * dy));
  pix[2] = texture(tex, coords + vec2( -1.0 * dx , 1.0 * dy));
  pix[3] = texture(tex, coords + vec2( 0.0 * dx , -1.0 * dy));
  pix[4] = texture(tex, coords + vec2( 0.0 * dx , 0.0 * dy));
  pix[5] = texture(tex, coords + vec2( 0.0 * dx , 1.0 * dy));
  pix[6] = texture(tex, coords + vec2( 1.0 * dx , -1.0 * dy));
  pix[7] = texture(tex, coords + vec2( 1.0 * dx , 0.0 * dy));
  pix[8] = texture(tex, coords + vec2( 1.0 * dx , 1.0 * dy));

  // average color differences around neighboring pixels
  float delta = (diff(pix[1],pix[7])+
                 diff(pix[5],pix[3]) +
                 diff(pix[0],pix[8])+
                 diff(pix[2],pix[6])
                 )/4.;

  // return threshold(0.25,0.4,clamp(3.0*delta,0.0,1.0));
  return threshold( u_threshold, 0.4, clamp( 3.0*delta, 0.0, 1.0 ) );
}

void main() {
  float isEdge = edge( inputTexture, vTexCoord0, u_resolution );
  vec4 colorEdge = vec4( vec3( isEdge ), 1. );
  vec4 color = texture( inputTexture, vTexCoord0 );
  oColor = mix(color, colorEdge, u_mix_amount );
}
