#define texture2D(A,B) texture(A,B)

#define RADIALBLUR_KERNELSIZE 64
#define RADIALBLUR_TYPE vec3
#define RADIALBLUR_SAMPLER_FNC(POS_UV) texture2D(tex, POS_UV).rgb
#include "../../shaders/glslLib/filter/radialBlur.glsl"

#define STRETCH_TYPE vec3
#define STRETCH_SAMPLER_FNC(POS_UV) texture2D(tex, POS_UV).rgb
#include "../../shaders/glslLib/operation/stretch.glsl"

#include "../../shaders/glslLib/generative/random.glsl"

#define NOISED_QUINTIC_INTERPOLATION
#include "../../shaders/glslLib/generative/noised.glsl"
#include "../../shaders/glslLib/color/blend/all.glsl"
#include "../../shaders/glslLib/fx/grain.glsl"

#include "../../shaders/glslLib/space/scale.glsl"
#include "../../shaders/glslLib/space/rotate.glsl"

#include "../../shaders/glslLib/color/space/rgb2hsv.glsl"
#include "../../shaders/glslLib/color/space/hsv2rgb.glsl"

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

uniform sampler2D u_color;
uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;
uniform sampler2D u_buffer2;
uniform sampler2D u_buffer3;
uniform sampler2D u_buffer4;
uniform sampler2D u_buffer5;

// Parameters
uniform float u_grainMix;
uniform float u_hueShift;
uniform float u_size;
uniform float u_smooth;
uniform float u_originalMix;
uniform float u_radialStrength;

// Colors
uniform vec3 u_mainColor;

void main() {
  vec2 uv = vTexCoord0;

#ifdef BUFFER_0

  vec3 color = vec3(0.);
  float sdf = length(uv - .5 + vec2(-.15, -.15));
  sdf = smoothstep(u_size, u_size + u_smooth * .1, sdf);
  color = vec3(sdf);
  oColor = vec4(color, 1.);

#elif defined(BUFFER_1)
  
  float sdf = texture(u_buffer0, uv).r;
  vec3 color = vec3(0.);
  // for (int i = 0; i < 1; i++) {
    // float f_i = float(i + 1) * 10.;
    // float strength = random(f_i) * .5;
    // vec2 dir = (random2(f_i) - .5) * 2.;
    color += radialBlur(u_buffer0, uv, vec2(1., 1.), u_radialStrength);    
    // color -= radialBlur(u_buffer0, uv, vec2(0., 1.), .1);
    // color += radialBlur(u_buffer0, uv, vec2(1., 1.), .1);
    // color -= radialBlur(u_buffer0, uv, vec2(1., -1.), .1);
  // }
  // color = mix(vec3(1.), (1. - sdf) * color, 1. - sdf);
  oColor = vec4(color, 1.);

#elif defined(BUFFER_2)

  vec3 color = vec3(0.);
  color += radialBlur(u_buffer0, uv + .0, vec2(1., 1.), .5);
  oColor = vec4(color, 1.);

#elif defined(BUFFER_3)

  vec3 color = vec3(0.);
  
  // for (int i = 0; i < 1; i++) {
  //   float f_i = float(i);
  //   vec2 offset = random2(f_i + 1.) * 2. - 1.;
  //   float sc = random(f_i + 25.) * 1.5 + .5;
  //   float factor = (i % 2 == 0) ? 1. : -1.;    
  //   vec3 c1 = factor * texture(u_buffer1, scale(uv + offset * .4, sc)).rgb;
  //   vec3 c2 = factor * texture(u_buffer2, scale(uv + offset * .4, sc)).rgb;
  //   color += (i % 2 == 0) ? c1 : c2;
  // }  
  // color = clamp(color, 0., 1.);

  color = texture(u_buffer1, uv).rgb;
  // color -= u_originalMix * texture(u_buffer0, uv).rgb;
  // color += .15 * texture(u_buffer1, scale(uv, 1.5) + .0).rgb;
  // color += .15 * texture(u_buffer1, scale(uv, 2.) + .0).rgb;
  // color += .15 * texture(u_buffer1, scale(uv, 2.5) + .0).rgb;

  // float g = grain(uv, u_resolution / 2.5, 0.);
  // color += g * u_grainMix * 1. * color.r;

  vec3 blue = u_mainColor;
  vec3 hsv = rgb2hsv(blue);
  hsv.r += u_hueShift * color.r;
  hsv.gb += .1 * color.gb;
  color = hsv2rgb(hsv);

  // color = mix(vec3(0.102, 0.427, 0.557), vec3(0.710, 0.851, 0.922), 1. - color.r);
  // color = mix(color, vec3(1.), .05);
  oColor = vec4(color, 1.);

#elif defined(BUFFER_4)

  vec4 displ = noised(vec3(uv * 8., u_time / 2.));
  // vec3 color = vec3(displ.yz * .5 + .5, 1.);
  vec3 color = texture(u_buffer5, uv + displ.yz * .005).rgb;
  vec3 orig = texture(u_buffer3, uv).rgb;
  color = mix(orig, color, .8);

  oColor = vec4(color, 1.);

#elif defined(BUFFER_5)

    oColor = texture(u_buffer4, uv);

#else

  oColor = texture(u_buffer5, uv);
  // float g = grain(uv, u_resolution / 2.5, 0.);
  // oColor += g * .05;

#endif
    
}
