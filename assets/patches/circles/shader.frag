#define texture2D(A,B) texture(A,B)

#include "../../shaders/glslLib/color/contrast.glsl"
#include "../../shaders/glslLib/color/desaturate.glsl"

uniform float u_time;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_whiteMix;
uniform vec2 u_resolution;
uniform sampler2D u_buffer0;

in vec2  vTexCoord0;
out vec4 oColor;

// Textures
uniform sampler2D u_syphonTex;

// Parameters

// Colors

void main() {
  vec2 uv = vTexCoord0;
  vec3 color = vec3(0.);

#ifdef BUFFER_0

  // Code here :)
  color = vec3(1.);
  color = texture2D(u_syphonTex, uv).rgb;

#else

  // Post-Processing
  color = texture(u_buffer0, uv).rgb;
  color = contrast(color, u_contrast * 2.);
  color = desaturate(color, u_saturation);
  color = mix(color, vec3(1.), u_whiteMix);

#endif  

  oColor = vec4(color, 1.);
}
