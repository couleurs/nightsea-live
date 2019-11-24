#define texture2D(A,B) texture(A,B)

#include "../../shaders/glslLib/color/contrast.glsl"
#include "../../shaders/glslLib/color/desaturate.glsl"
#include "../../shaders/glslLib/draw/rectSDF.glsl"
#include "../../shaders/glslLib/draw/fill.glsl"
#include "../../shaders/glslLib/generative/snoise.glsl"
#include "../../shaders/glslLib/generative/gnoise.glsl"
#include "../../shaders/glslLib/generative/random.glsl"
#include "../../shaders/couleurs_lib/lut.glsl"

uniform float u_time;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_whiteMix;
uniform vec2 u_resolution;
uniform sampler2D u_buffer0;
uniform sampler2D u_lookup_couleurs_bw;

in vec2  vTexCoord0;
out vec4 oColor;

// Textures

// Parameters

// Colors

#define NUM_RECTS 20

void main() {
  vec2 uv = vTexCoord0;
  vec3 color = vec3(0.);

#ifdef BUFFER_0

  // Code here :)
  vec3 bg = vec3(.065, .07, .075);
  color = bg;
  
  // Base grid
  float size = 20.;
  float r_1 = random(floor(uv * size / 2.) + vec2(11., 22.));
  vec2 st = fract(uv * size);
  vec2 st_small = fract(uv * size * 2.);
  float thresh = step(1.1, r_1);
  float sdf = rectSDF(mix(st, st_small, thresh), vec2(1.9));
  float s = random(uv) * size / 2.;
  vec2 st_r = floor((uv + .5) * s);
  float r = random(st_r);  
  float f = fill(sdf, mix(mix(.52, .515, thresh), .53, r));
  color += vec3(1. - f) * vec3(0.914, 0.945, 0.976);

  // Partial fading
  float r_2 = random(floor(uv * size / 2.));
  float r_3 = random(floor(uv * size * 1.));
  float n_2 = gnoise(u_time * .2 + r_2 * 25.);
  n_2 *= sin(fract(uv * size / 2.).y + u_time * .3 + r_2 * 9.) * .5 + .5;
  float n_3 = gnoise(u_time * .3 + r_3 * 10.);
  n_3 *= sin(fract(uv * size).x + u_time * .2 + r_3 * 10.) * .5 + .5;
  color = mix(color, bg, clamp(2. * smoothstep(.0, .2, n_2) * smoothstep(.0, .3, n_3), 0., 1.));
  color = mix(color, lut(color, u_lookup_couleurs_bw), .3);

  vec2 uvt = floor((uv * size));
  float r_4 = random(uvt);
  float t = sin(u_time * .2 + r_4 * 10.) * .5 + .5;
  // color = vec3(f);

#else

  // Post-Processing
  color = texture(u_buffer0, uv).rgb;
  color = contrast(color, u_contrast * 2.);
  color = desaturate(color, u_saturation);
  color = mix(color, vec3(1.), u_whiteMix);

#endif  

  oColor = vec4(color, 1.);
}
