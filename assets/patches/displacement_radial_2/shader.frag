#define texture2D(A,B) texture(A,B)

#include "../../shaders/glslLib/color/contrast.glsl"
#include "../../shaders/glslLib/color/desaturate.glsl"
#include "../../shaders/glslLib/color/space/hsv2rgb.glsl"
#include "../../shaders/glslLib/color/space/rgb2hsv.glsl"

#include "../../shaders/glslLib/math/const.glsl"

#include "../../shaders/glslLib/space/polar2cartesian.glsl"

#include "../../shaders/glslLib/generative/random.glsl"

#define RADIALBLUR_KERNELSIZE 16
#include "../../shaders/glslLib/filter/radialBlur.glsl"

uniform float u_time;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_whiteMix;
uniform vec2 u_resolution;
uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;
uniform sampler2D u_buffer2;

in vec2  vTexCoord0;
out vec4 oColor;

// Textures
uniform sampler2D u_palette;

// Parameters
uniform float u_hueMin;
uniform float u_hueMax;
 
// Colors

vec3 colorMap(float t, float a) {
  // return texture(u_palette, vec2(t, .5)).rgb;  
  vec3 red = vec3(1.000, 0.031, 0.000); // vec3(0.910, 0.231, 0.325)
  vec3 blue = vec3(0.702, 0.875, 0.953);
  return mix(blue, vec3(1.000, 0.780, 1.000), clamp(1. - t, .0, 1.));
}

void main() {
  vec2 uv = vTexCoord0;
  vec3 color = vec3(0.);

#ifdef BUFFER_0

  // Code here :)
  color = vec3(1., 0., 0.);
  // float rr = mix(1., 1., random(uv.y));
  float r = random(floor(uv.y * 25. + 2.));
  r = mix(u_hueMin, u_hueMax, r);
  color = hsv2rgb(vec3(r, 1., 1.));;
  float r_c = random(r);
  oColor = vec4(color, step(.5, r_c));
  // color *= smoothstep(.1, .6, vec3(1. - length(uv - .5)));

#elif defined( BUFFER_1 )

  // Old frame
  vec3 orig = texture(u_buffer0, uv).rgb;

  // New frame
  color = texture(u_buffer2, uv).rgb;
  float hue = rgb2hsv(color).r;
  float angle = random(uv) * hue * TWO_PI + u_time * 1.;
  vec2 displ = polar2cartesian(.1, angle) * 2. - 1.;
  vec3 fback = texture(u_buffer2, uv + displ * 1.).rgb;

  color = mix(orig, fback, .92);  
  oColor = vec4(color, texture(u_buffer0, uv).a);

#elif defined( BUFFER_2 )

  color = radialBlur(u_buffer1, uv, .0 * vec2(1., sin(1. * u_time))).rgb;
  oColor = vec4(color, texture(u_buffer1, uv).a);

#else

  // Post-Processing
  color = texture(u_buffer2, uv).rgb;
  color = contrast(color, u_contrast * 5.);
  color = desaturate(color, u_saturation);
  color = colorMap(color.r, texture(u_buffer2, uv).a);
  color = desaturate(color, -1.);
  color = mix(color, vec3(1.), u_whiteMix);  
  // color *= 1.05;
  oColor = vec4(color, 1.);

#endif  
}
