#define texture2D(A,B) texture(A,B)

#include "../../shaders/glslLib/color/contrast.glsl"
#include "../../shaders/glslLib/color/desaturate.glsl"

#include "../../shaders/glslLib/color/space/rgb2hsv.glsl"
#include "../../shaders/glslLib/color/space/hsv2rgb.glsl"

#include "../../shaders/glslLib/generative/snoise.glsl"
#include "../../shaders/glslLib/generative/gnoise.glsl"
#include "../../shaders/glslLib/generative/random.glsl"

#include "../../shaders/glslLib/math/within.glsl"
#include "../../shaders/glslLib/math/map.glsl"

uniform float u_time;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_whiteMix;
uniform vec2 u_resolution;
uniform sampler2D u_buffer0;

in vec2  vTexCoord0;
out vec4 oColor;

// Textures

// Parameters
uniform float u_offset;
uniform float u_blur;

// Colors

void main() {
  vec2 uv = vTexCoord0;
  vec3 color = vec3(0.);

#ifdef BUFFER_0

  // Code here :)
  color = vec3(1.);

  float fill = 0.;
  float alpha = 0.;
  float count = 3.;
  float delta = .002;
  float prev_y = 0.;
  for (int i = 0; i < int(count); i++) {
    float f_i = float(i);
    float r_i = random(f_i);
    float speed = .05 + r_i * .05;
    float amp = .1;
    float offset = f_i / count + snoise(vec3(uv.x, f_i, u_time * .01)) * u_offset;
    float noise = (snoise(vec2(uv.x, u_time * speed + r_i * 10.)) * .5 + .5) * amp + offset;    
    float mask = within(prev_y, noise, uv.y);
    float g = sin(map(uv.y, prev_y, noise, 0., 1.) * 3.14);
    alpha += g * mask;
    prev_y = noise;
    fill += smoothstep(noise - delta, noise + delta + u_blur, uv.y) * .1;
  }
  
  vec3 blue = vec3(0.549, 0.812, 0.984);
  // blue = vec3(0.984, 0.820, 0.965);
  vec3 hsv = rgb2hsv(blue);
  fill = max(.2, fill);  
  hsv.g = fill * mix(.5, 1., alpha);
  color = hsv2rgb(hsv);
  color += random(uv) * .02 * (1. - alpha);

  // color = vec3(alpha);

#else

  // Post-Processing
  color = texture(u_buffer0, uv).rgb;
  color = contrast(color, u_contrast * 2.);
  color = desaturate(color, u_saturation);
  color = mix(color, vec3(1.), u_whiteMix);

#endif  

  oColor = vec4(color, 1.);
}
