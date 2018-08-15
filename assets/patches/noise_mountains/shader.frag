#include "../../shaders/couleurs_lib/snoise.glsl"
#include "../../shaders/couleurs_lib/grain.glsl"
#include "../../shaders/couleurs_lib/lut.glsl"

#include "../../shaders/fb_lib/math/within.glsl"
#include "../../shaders/fb_lib/math/map.glsl"
#include "../../shaders/fb_lib/generative/random.glsl"
#include "../../shaders/fb_lib/color/contrast.glsl"

#define GAUSSIANBLUR1D_TYPE vec3
#define GAUSSIANBLUR1D_SAMPLER_FNC(POS_UV) texture(tex, POS_UV).rgb
#include "../../shaders/fb_lib/filter/gaussianBlur/1D.glsl"

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;

uniform sampler2D u_lookup_1;
uniform sampler2D u_lookup_2;
uniform sampler2D u_lookup_3;

// Parameters
uniform float u_noiseAmplitude;
uniform float u_noiseScale;
uniform float u_blurRadius;
uniform float u_bottomWhiteMix;
uniform float u_topWhiteMix;
uniform float u_lutMix;

#define NUM_LAYERS 15
void main() {
#ifdef BUFFER_0

  vec3 color = vec3(0.);
  float alpha = 0.;
  float f_layers = float(NUM_LAYERS);
  float noise_amplitude = u_noiseAmplitude;
  float noise_offset = .2;
  float noise_spacing = 1. / f_layers;
  float prev_y = 0;
  for (int i = 0; i < NUM_LAYERS; i++) {
    float f_i = float(i);
    float speed = random(f_i) * .05 + .1;;
    float y = snoise(vec2(vTexCoord0.x * u_noiseScale + f_i * noise_offset, u_time * speed)) * noise_amplitude + .1 + f_i * noise_spacing;
    float s = within(prev_y, y, vTexCoord0.y);
    float g = map(vTexCoord0.y, prev_y, y, 0., 1.);
    color += mix(vec3(g, .5, .5), vec3(1.), mix(u_bottomWhiteMix, u_topWhiteMix, f_i / f_layers)) * s;
    alpha += g * s;
    prev_y = y;
  }
  color += vec3(1.) * step(prev_y, vTexCoord0.y);
  oColor = vec4(vec3(color), alpha);

#elif defined(BUFFER_1)

  float a = texture(u_buffer0, vTexCoord0).a;
  vec3 color = gaussianBlur1D(u_buffer0, vTexCoord0, vec2(a * u_blurRadius / u_resolution.x, 0.), 20);
  oColor = vec4(color, a);

#else

  float a = texture(u_buffer0, vTexCoord0).a;
  vec3 color = gaussianBlur1D(u_buffer1, vTexCoord0, vec2(0., a * u_blurRadius / u_resolution.y), 20);  

  // Grain
  vec3 grain = vec3(grain(vTexCoord0, u_resolution / 2.5, u_time / 2., 2.5));
  color += grain * .15;  
  // color += grain * mix(.1, .15, 1. - a);
  // color = vec3(a);

  // color = texture(u_buffer0, vTexCoord0).rgb;
  color = mix(color, lut(color, u_lookup_1), u_lutMix);
  oColor = vec4(color, 1.);

#endif
}
