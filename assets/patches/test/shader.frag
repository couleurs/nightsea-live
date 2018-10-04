#define texture2D(A,B) texture(A,B)

#define RADIALBLUR_TYPE vec3
#define RADIALBLUR_SAMPLER_FNC(POS_UV) texture2D(tex, POS_UV).rgb
#include "../../shaders/glslLib/filter/radialBlur.glsl"

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

  oColor.rgb = radialBlur(u_buffer0, uv, vec2(.5, 1.));

#endif
    
}
