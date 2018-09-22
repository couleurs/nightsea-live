#include "../../shaders/fb_lib/generative/random.glsl"
#include "../../shaders/couleurs_lib/snoise.glsl"
#include "../../shaders/fb_lib/space/rotate.glsl"
#include "../../shaders/fb_lib/space/scale.glsl"
#include "../../shaders/fb_lib/math/const.glsl"
#include "../../shaders/fb_lib/color/contrast.glsl"
#include "../../shaders/fb_lib/color/luma.glsl"
#include "../../shaders/couleurs_lib/grain.glsl"

#define GAUSSIANBLUR1D_SAMPLER_FNC(POS_UV) texture(tex, POS_UV)
#include "../../shaders/fb_lib/filter/gaussianBlur/1D.glsl"

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;
uniform sampler2D u_buffer2;

// Parameters
uniform float u_step;
uniform float u_bigStep;
uniform float u_size;
uniform float u_blur;
uniform float u_contrast;
uniform float u_whiteMix;
uniform float u_r1Seed;
uniform float u_r2Seed;

// Colors
uniform vec3 u_c1;
uniform vec3 u_c2;

void main() {
  vec2 uv = vTexCoord0;

#ifdef BUFFER_0

  vec3 color = vec3(0.);
  
  float r1 = random(vec3(floor(uv * .2 * 100.), u_r1Seed));
  float r2 = random(vec3(floor(uv * .1 * 100.), u_r2Seed));

  float r = mix(r1, r2, step(u_bigStep, r2));
  float r_step = step(u_step, r);
  color = vec3(r_step);
  oColor = vec4(color, r);

#elif defined( BUFFER_1 )

  vec3 color = vec3(0.);
  float r = texture(u_buffer0, uv).a;
  // uv = rotate(uv, snoise(vec2(r, 10.)) * PI);
  // uv = scale(uv, mix(.5, 1.5, snoise(vec2(r, 32.)) + 1. / 2.));
  color = texture(u_buffer0, uv).rgb;
  oColor = vec4(color, 1.);

#elif defined( BUFFER_2 )

  float r = texture(u_buffer0, uv).a;
  oColor = gaussianBlur1D(u_buffer1, uv, vec2(r * u_blur * 1000. / u_resolution.x, 0.), 20);

#else
  
  float r = texture(u_buffer0, uv).a;
  r = mix(.03, 1., r);
  float c = gaussianBlur1D(u_buffer2, uv, vec2(0., r * u_blur * 1000. / u_resolution.y ), 20).r;
  
  c = contrast(c, 1. + u_contrast * 2.);

  // Blue tones
  // c1 = vec3(0.576, 0.690, 0.714);
  // c2 = vec3(0.459, 0.592, 0.714);

  vec3 color = mix(u_c1, u_c2, c * 1.);  
  float g = grain(uv, u_resolution / 2.5, 0., 10.);
  color += g * mix(.1, .3, 1. - r);
  // color = vec3(c);
  color = mix(color, vec3(1.), u_whiteMix);
  oColor = vec4(color, 1.);
  // oColor = vec4(vec3(c), 1.);

#endif
      
}
