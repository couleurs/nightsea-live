#define texture2D(A,B) texture(A,B)

#include "../../shaders/glslLib/generative/random.glsl"

#define NOISED_QUINTIC_INTERPOLATION
#include "../../shaders/glslLib/generative/noised.glsl"
#include "../../shaders/glslLib/color/blend/all.glsl"
#include "../../shaders/glslLib/fx/grain.glsl"

#include "../../shaders/glslLib/space/scale.glsl"
#include "../../shaders/glslLib/space/rotate.glsl"

#include "../../shaders/glslLib/color/space/rgb2hsv.glsl"
#include "../../shaders/glslLib/color/space/hsv2rgb.glsl"
#include "../../shaders/glslLib/color/contrast.glsl"

#include "../../shaders/glslLib/math/mix.glsl"
#include "../../shaders/glslLib/math/const.glsl"

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

// Parameters
uniform float u_feedbackAmount;
uniform float u_displacementAmount;
uniform float u_hueBase;
uniform float u_hueRange;
uniform float u_saturation;
uniform float u_size;

// Colors
uniform vec3 u_mainColor;

void main() {
  vec2 uv = vTexCoord0;

#ifdef BUFFER_0

  vec3 color = vec3(0.);
  float sdf = length(uv - .5);
  sdf = abs(uv.y - uv.x);
  // sdf = smoothstep(.5, .8, sdf);  
  color = vec3(1. - sdf);
  // color *= vec3(0.196, 0.729, 0.765);
  oColor = vec4(color, 1.);

#elif defined(BUFFER_1)

  vec4 displ = noised(vec3(uv * u_size * 100., u_time * 0.));
  vec3 color = texture(u_buffer2, uv + displ.yz * u_displacementAmount * .1).rgb;
  vec3 hsv = rgb2hsv(color);
  color = hsv2rgb(hsv);

  vec3 orig = texture(u_buffer0, uv).rgb;
  color = mix(orig, color, u_feedbackAmount);

  oColor = vec4(color, 1.);

#elif defined(BUFFER_2)

  oColor = texture(u_buffer1, uv);

#elif defined(BUFFER_3)

  vec4 color = texture(u_buffer2, uv); 
  vec4 fback = texture(u_buffer4, scale(uv, .4));
  oColor = mix(color, fback, .0);

#elif defined(BUFFER_4)

  oColor = texture(u_buffer3, uv);

#else

  vec3 color = texture(u_buffer3, uv).rgb;
  // float sdf = color.r;
  float sdf = sin(color.r * 50. + u_time * 0.) * .5 + .5;
  float r = random(sdf);
  float hue = mix(u_hueBase, u_hueBase + u_hueRange, sdf);
  
  vec3 hsv = vec3(hue, r * .5, 1.);
  color = hsv2rgb(hsv);

  float g = grain(uv, u_resolution / 2.5);
  // color += g * hue * .15;

  // color *= 1. - smoothstep(.3, .5, length(uv - .5));
  
  oColor = vec4(color, 1.);

#endif
    
}
