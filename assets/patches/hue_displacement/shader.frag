#define texture2D(A,B) texture(A,B)

#include "../../shaders/glslLib/generative/random.glsl"
#include "../../shaders/glslLib/generative/snoise.glsl"
#include "../../shaders/glslLib/color/space/rgb2hsv.glsl"
#include "../../shaders/glslLib/color/space/hsv2rgb.glsl"
#include "../../shaders/glslLib/math/const.glsl"
#include "../../shaders/glslLib/space/polar2cartesian.glsl"
#include "../../shaders/glslLib/math/within.glsl"
#include "../../shaders/glslLib/fx/grain.glsl"

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

// Textures
uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;
uniform sampler2D u_buffer2;

// Parameters
uniform float u_blackStep;
uniform float u_size;

// Colors

vec3 colorMap(float t) {
  float g = grain(vTexCoord0, u_resolution / 100.5);  
  vec3 red = mix(vec3(0.984, 0.216, 0.306), vec3(1.), 0.) + vec3(g) * .0;
  vec3 black = mix(vec3(0.055, 0.035, 0.051), vec3(.0), t) + vec3(g) * .0;
  vec3 white = vec3(.97, .94, .99);
  // return within(0., .5, t) * black + within(.5, .9, t) * red + within(.9, 1., t) * white;
  return mix(black, red, step(u_blackStep, t));
}

void main() {
  vec2 uv = vTexCoord0;
  vec3 color = vec3(0.);

#ifdef BUFFER_0  

  float r = random(floor(uv * u_size));
  float hue = r + u_time * 1. * 55.5;
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

  oColor = texture(u_buffer1, uv);

#else

  color = texture(u_buffer2, uv).rgb;
  float h = rgb2hsv(color).r;
  color = colorMap(h); 
  // color = vec3(1.); 
  oColor = vec4(color, 1.);

#endif
  
}
