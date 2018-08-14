#include "../../shaders/couleurs_lib/snoise.glsl"

#include "../../shaders/fb_lib/math/within.glsl"
#include "../../shaders/fb_lib/math/map.glsl"
#include "../../shaders/fb_lib/generative/random.glsl"

#define GAUSSIANBLUR1D_TYPE vec3
#define GAUSSIANBLUR1D_SAMPLER_FNC(POS_UV) texture(tex, POS_UV).rgb
#include "../../shaders/fb_lib/filter/gaussianBlur/1D.glsl"

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;

// Parameters
uniform float u_noiseAmplitude;
uniform float u_blurRadius;

#define NUM_LAYERS 10
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
    float y = snoise(vec2(vTexCoord0.x * 5. + f_i * noise_offset, u_time * speed)) * noise_amplitude + .1 + f_i * noise_spacing;
    float s = within(prev_y, y, vTexCoord0.y);
    float g = map(vTexCoord0.y, prev_y, y, 0., 1.);
    color += mix(vec3(g, .5, .5), vec3(1.), mix(.8, .95, f_i / f_layers)) * s;
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

  float a = texture(u_buffer1, vTexCoord0).a;
  vec3 color = gaussianBlur1D(u_buffer1, vTexCoord0, vec2(0., a * u_blurRadius / u_resolution.y), 20);
  oColor = vec4(color, 1.);

#endif
}
