#include "../../shaders/fb_lib/generative/random.glsl"
#include "../../shaders/fb_lib/color/desaturate.glsl"
#include "../../shaders/couleurs_lib/grain.glsl"

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

#define NUM_LAYERS 6

// Parameters
uniform float u_noiseMax;
uniform float u_bgIntensity;
uniform float u_smallBlueSize;
uniform float u_smallRedSize;
uniform float u_xOffset;
uniform float u_yOffset;

float sizes[NUM_LAYERS] = float[NUM_LAYERS](3.,
                                            3.,
                                            u_smallBlueSize * 100.,
                                            u_smallRedSize * 100.,
                                            55.,
                                            55.);

const float steps[NUM_LAYERS] = float[NUM_LAYERS](.81,
                                                  .81,
                                                  .964,
                                                  .965,
                                                  .995,
                                                  .995);

const vec3 colors[NUM_LAYERS] = vec3[NUM_LAYERS](vec3(.169, .318, .752), 
                                                 vec3(.778, .272, .299), 
                                                 vec3(.169, .318, .752),
                                                 vec3(.778, .272, .299),
                                                 vec3(.778, .272, .299),
                                                 vec3(.169, .318, .752));


void main() {
// #ifdef BUFFER_0
// #elif defined( BUFFER_1 )
// #else
// #endif
  
  vec2 uv = vTexCoord0;
  vec3 color = vec3(.0);
  vec3 red = vec3(.778, .272, .299);
  vec3 blue = vec3(.169, .318, .752);
  float f_num_layers = float(NUM_LAYERS - 1);
  float r_mask = 0.;
  float r_step_mask = 0.;

  for (int i = 0; i < NUM_LAYERS; i++) {
    float f_i = float(i);    
    float r_1 = random(floor(vec2(uv.y + 10. * u_xOffset, uv.x + 10. * u_yOffset) * sizes[i])) * 20.;
    float r = random(vec3(floor(uv * r_1), f_i));
    float r_step = step(steps[i], r);
    r_mask += r;
    r_step_mask += r_step;
    color += vec3(r_step) * colors[i];
  }

  // Saturate
  color = desaturate(color, -2.5);

  // Grain
  float g = grain(uv, u_resolution / 2.5, 0., 10.);
  color += max(u_bgIntensity, r_step_mask) * g * mix(.05, u_noiseMax, r_mask);

  // Gamma correction
  // float gamma = 2.2;
  // color = pow(color, vec3(1. / gamma));

  oColor = vec4(color, 1.);
}
