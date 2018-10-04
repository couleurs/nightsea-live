#define texture2D(A,B) texture(A,B)

#define RADIALBLUR_KERNELSIZE 64
#define RADIALBLUR_TYPE vec3
#define RADIALBLUR_SAMPLER_FNC(POS_UV) texture2D(tex, POS_UV).rgb
#include "../../shaders/glslLib/filter/radialBlur.glsl"

#include "../../shaders/glslLib/generative/random.glsl"
#include "../../shaders/glslLib/color/blend/all.glsl"

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

uniform sampler2D u_color;
uniform sampler2D u_buffer0;

// Parameters

void main() {
  vec2 uv = vTexCoord0;

#ifdef BUFFER_0

  vec3 color = vec3(0.);
  float sdf = length(uv - .5);
  sdf = step(.2, sdf);
  color = vec3(sdf);
  oColor = vec4(color, 1.);

#else
  
  float sdf = texture(u_buffer0, uv).r;
  vec3 color = vec3(0.);
  for (int i = 0; i < 1; i++) {
    // float f_i = float(i + 1) * 10.;
    // float strength = random(f_i) * .5;
    // vec2 dir = (random2(f_i) - .5) * 2.;
    color += radialBlur(u_buffer0, uv, vec2(1.), .175);
  }
  // color = mix(vec3(1.), (1. - sdf) * color, 1. - sdf);
  oColor = vec4(color, 1.);

#endif
    
}
