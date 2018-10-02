#include "../../shaders/couleurs_lib/lut.glsl"
#include "../../shaders/couleurs_lib/grain.glsl"
#include "../../shaders/fb_lib/color/contrast.glsl"
#include "../../shaders/fb_lib/draw/rectSDF.glsl"
#include "../../shaders/fb_lib/draw/fill.glsl"
#include "../../shaders/fb_lib/space/scale.glsl"
#include "../../shaders/fb_lib/color/blend/all.glsl"
#include "../../shaders/fb_lib/animation/easing/sine.glsl"
#include "../../shaders/fb_lib/animation/easing/quadratic.glsl"

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

// Textures
uniform sampler2D u_flowMapNoise;
uniform sampler2D u_inputA;
uniform sampler2D u_inputB;
uniform sampler2D u_inputC;
uniform sampler2D u_inputD;
uniform sampler2D u_lookup;

uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;

#define INPUT u_inputC

// Parameters
uniform float u_speed;
uniform float u_strength;
uniform float u_scaleX;
uniform float u_scaleY;
uniform float u_yOffset;
uniform float u_sineMix;
uniform float u_grainMix;
uniform float u_sdfContrast;

// Colors
uniform vec3 u_bg;
uniform vec3 u_fg;

#define KERNEL_SIZE 2
// vec4 sharpen(in sampler2D tex, in vec2 coords, in vec2 renderSize) {
//   float dx = 1.0 / renderSize.x;
//   float dy = 1.0 / renderSize.y;
//   vec4 sum = vec4(0.0);
//   for (int i = 0; i < KERNEL_SIZE; i++) {
//     float f_size = float(i) + 1.;
//     sum += -1. * texture(tex, coords + vec2( -1.0 * dx , 0.0 * dy) * f_size);
//     sum += -1. * texture(tex, coords + vec2( 0.0 * dx , -1.0 * dy) * f_size);
//     sum += 5. * texture(tex, coords + vec2( 0.0 * dx , 0.0 * dy) * f_size);
//     sum += -1. * texture(tex, coords + vec2( 0.0 * dx , 1.0 * dy) * f_size);
//     sum += -1. * texture(tex, coords + vec2( 1.0 * dx , 0.0 * dy) * f_size);
//   }
//   return sum / float(KERNEL_SIZE);
// }

vec3 sharpen(in sampler2D tex, in vec2 coords, in vec2 renderSize) {
  float dx = 1.0 / renderSize.x;
  float dy = 1.0 / renderSize.y;
  vec3 sum = vec3(0.0);
  for (int i = 0; i < KERNEL_SIZE; i++) {
    float f_size = float(i) + 1.;
    sum += -1. * texture(tex, coords + vec2( -1.0 * dx , 0.0 * dy) * f_size).rgb;
    sum += -1. * texture(tex, coords + vec2( 0.0 * dx , -1.0 * dy) * f_size).rgb;
    sum += 5. * texture(tex, coords + vec2( 0.0 * dx , 0.0 * dy) * f_size).rgb;
    sum += -1. * texture(tex, coords + vec2( 0.0 * dx , 1.0 * dy) * f_size).rgb;
    sum += -1. * texture(tex, coords + vec2( 1.0 * dx , 0.0 * dy) * f_size).rgb;
  }
  return sum / float(KERNEL_SIZE);
}


void main() {
  vec2 uv = vTexCoord0;

#ifdef BUFFER_0

  vec3 color = vec3(0.);
  color = texture(INPUT, scale(uv, vec2(mix(1. + u_scaleX, 1., smoothstep(.2, .6, uv.y)), mix(u_scaleY, 1., step(.5, uv.y)))) + vec2(0., -u_yOffset)).rgb;

  vec3 bg = u_bg;
  float sdf = contrast(color, u_sdfContrast * 5.).r;
  sdf = clamp(sdf, 0., 1.);

  float num_layers = 35.;
  sdf = floor(sdf * num_layers) / num_layers;
  sdf = mix(sdf, sineIn(sdf), u_sineMix);
  sdf = mix(0., .75, sdf);   
  
  float grain_sdf = contrast(color, 2.).r;
  grain_sdf = smoothstep(.34, .7, grain_sdf);  

  color = mix(u_fg, bg, sdf); 
  oColor = vec4(vec3(color), grain_sdf);  

#elif defined( BUFFER_1 )

  // Sharpen
  vec4 c = texture(u_buffer0, uv);
  vec3 sharp = sharpen(u_buffer0, uv, u_resolution);
  oColor = vec4(mix(c.rgb, sharp, 1.), c.a);

#else

  vec4 c = texture(u_buffer1, uv);
  float flow = texture(u_buffer1, uv).a;

  // Grain
  float g = grain(uv, u_resolution / 2.5, 0., 10.);
  c.rgb += g * mix(.0, u_grainMix, 1. - c.a);

  oColor = vec4(c.rgb, 1.);

#endif
}
