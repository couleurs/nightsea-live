#define texture2D(A,B) texture(A,B)

#include "../../shaders/glslLib/generative/random.glsl"
#include "../../shaders/glslLib/generative/snoise.glsl"
#include "../../shaders/glslLib/color/space/rgb2hsv.glsl"
#include "../../shaders/glslLib/color/space/hsv2rgb.glsl"
#include "../../shaders/glslLib/color/contrast.glsl"
#include "../../shaders/glslLib/math/const.glsl"
#include "../../shaders/glslLib/space/polar2cartesian.glsl"
#include "../../shaders/glslLib/math/within.glsl"
#include "../../shaders/glslLib/math/mix.glsl"
#include "../../shaders/glslLib/fx/grain.glsl"
#include "../../shaders/glslLib/animation/easing/sine.glsl"
#include "../../shaders/glslLib/animation/easing/cubic.glsl"

#define RADIALBLUR_KERNELSIZE 16
#include "../../shaders/glslLib/filter/radialBlur.glsl"

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

// Textures
uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;
uniform sampler2D u_buffer2;
uniform sampler2D u_palette;

// Parameters
uniform float u_blackStep;
uniform float u_size;
uniform float u_radial;
uniform float u_saturation;
uniform float u_contrast;

// Colors

vec3 colorMap(float t) {
  float tt = smoothstep(.0, u_blackStep + .0, t) * vTexCoord0.x;  
  tt = sineInOut(tt);
  // vec3 color = tt > 0. ? hsv2rgb(vec3(mix(.6, 1., tt), .5, 1.)) : vec3(0.);
  vec3 color = hsv2rgb(vec3(mix(.6, 1., tt), u_saturation, .9));
  // color = texture(u_palette, vec2(tt, .5)).rgb;
  // color = mix(vec3(0.737, 0.157, 0.200), vec3(0.769, 0.302, 0.349), vec3(0.510, 0.655, 0.718), vec3(0.804, 0.741, 0.788), tt);
  color = mix(vec3(0.000, 0.384, 0.733), vec3(0.765, 0.800, 0.847), tt);
  float g = grain(vTexCoord0, u_resolution / 2.5);
  color += g * mix(.2, 0., tt);
  return color;
}

void main() {
  vec2 uv = vTexCoord0;
  vec3 color = vec3(0.);

#ifdef BUFFER_0  
  float n = snoise(floor(uv * 5.)) * .5 + .5;  
  n = n * u_size;
  float r = snoise(uv * n);
  float hue = r + u_time * 1. * 0.2;
  // hue = length(uv - .5) - u_time * .2;
  color = hsv2rgb(vec3(hue, .8, 1.));

  oColor = vec4(color, 1.);

#elif defined( BUFFER_1 )

  // Old frame
  vec3 orig = texture(u_buffer0, uv).rgb;

  // New frame
  color = texture(u_buffer2, uv).rgb;
  float hue = rgb2hsv(color).r;
  float angle = hue * TWO_PI;//snoise(vec2(hue, u_time * .1)) * PI;
  vec2 displ = polar2cartesian(.1, angle) * 2. - 1.;
  vec3 fback = texture(u_buffer2, uv + displ * .01).rgb;

  color = mix(orig, fback, .99);
  oColor = vec4(color, 1.);

#elif defined( BUFFER_2 )

  // oColor = texture(u_buffer1, uv);
  oColor = radialBlur(u_buffer1, uv, vec2(u_radial * .2));

#else

  color = texture(u_buffer2, uv).rgb;
  float h = rgb2hsv(color).r;
  color = colorMap(h); 
  // color = vec3(1.); 
  color = contrast(color, 1. + u_contrast);
  oColor = vec4(color, 1.);

#endif
  
}
