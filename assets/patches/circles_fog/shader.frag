#define texture2D(A,B) texture(A,B)

#include "../../shaders/glslLib/color/contrast.glsl"
#include "../../shaders/glslLib/color/desaturate.glsl"
#include "../../shaders/glslLib/generative/random.glsl"
#include "../../shaders/glslLib/generative/gnoise.glsl"
#include "../../shaders/glslLib/color/space/rgb2hsv.glsl"
#include "../../shaders/glslLib/color/space/hsv2rgb.glsl"
#include "../../shaders/glslLib/color/space/rgb2luma.glsl"
#include "../../shaders/glslLib/fx/chromaAB.glsl"
#include "../../shaders/glslLib/filter/gaussianBlur/2D.glsl"
#include "../../shaders/glslLib/space/rotate.glsl"
#include "../../shaders/glslLib/space/ratio.glsl"
#include "../../shaders/couleurs_lib/lut.glsl"
#include "../../shaders/couleurs_lib/grain.glsl"
#include "../../shaders/couleurs_lib/sharpen.glsl"

uniform float u_time;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_whiteMix;
uniform vec2 u_resolution;
uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;
uniform sampler2D u_buffer2;

in vec2  vTexCoord0;
out vec4 oColor;

// Textures
uniform sampler2D u_syphonTex;
uniform sampler2D u_blueNoise;
uniform sampler2D u_lut;
uniform sampler2D u_lut_2;

// Parameters
uniform float u_speed;
uniform float u_intensity;
uniform float u_size;
uniform float u_thickness;
uniform float u_count;
uniform float u_hueShift;
uniform float u_diffPattern;
uniform float u_numLines;
uniform float u_lutMix;
uniform float u_chromaAmount;

// Colors


vec2 randomPos(float t, float speed) {
  float x = random(floor(t * speed));
  float y = random(floor(t * speed + 120.));
  return vec2(x, y);
}

vec2 noiseDisplacement(float t, float speed) {
  float x = gnoise(t * .1 * speed + 15.55);
  float y = gnoise(t * .15 * speed - 88.88);
  return vec2(x, y);
}

#define NUM_COLORS 1
vec3 COLOR_MASKS[NUM_COLORS] = vec3[]( vec3(1., 1., 1.)                                      
                                    );
vec3 randomColor(float t, float speed) {
  int index = int(floor(random(floor(t * speed)) * float(NUM_COLORS)));
  return COLOR_MASKS[index];
}

float randomSize(float t, float speed, float offset) {
  return random(vec2(floor(t * speed), offset));
}

float expImpulse(float x, float k) {
    float h = k * x;
    return h * exp(1. - h);
}

void main() {
  vec2 uv = vTexCoord0;
  vec3 color = vec3(0.);

#ifdef BUFFER_0

  // Code here :)
  // color = texture2D(u_syphonTex, uv).rgb;

    
  color = texture(u_buffer2, uv).rgb;
  vec2 pixel_size = uv / u_resolution;
  float impulse = expImpulse(fract(u_time * .1), 50.);

  int num = int(u_count + impulse * 0.);
  for (int i = 0; i < num; i++) {
    float f_i = float(i);
    float new_random_speed = random(f_i) * .1;
    vec2 pos = randomPos(u_time + f_i * 100., new_random_speed) + mix(vec2(-.5), vec2(.5), noiseDisplacement(u_time + f_i * 50., u_speed * 1.));
    vec2 mouse_xy = pos * u_resolution;
    float dist = distance(mouse_xy, uv * u_resolution);
    float size = u_size + mix(-1., 1., randomSize(u_time + f_i * 100., new_random_speed, 10.)) * 40.;
    float thickness = u_thickness + mix(-1., 1., randomSize(u_time + f_i * 100., new_random_speed, 20.)) + 3.;
    float l1 = 1. - smoothstep(size, size + thickness, dist);
    float l2 = smoothstep(size - thickness, size, dist);
    color += randomColor(u_time + f_i * 20., 1.) * u_intensity * l1;
  }
  
  // Reset
  // color = vec3((1. - smoothstep(0., 150., dist)));

  vec4 left = texture(u_buffer2, uv + vec2(-pixel_size.x, 0.));
  vec4 top = texture(u_buffer2, uv + vec2(0., pixel_size.y));
  vec4 right = texture(u_buffer2, uv + vec2(pixel_size.x, 0.));
  vec4 bottom = texture(u_buffer2, uv + vec2(0., -pixel_size.y));  

  // Borders
  float border_factor = 10.;
  if (uv.x - pixel_size.x <= border_factor * pixel_size.x) left = vec4(0.);
  if (uv.y + pixel_size.y >= 1. - border_factor * pixel_size.y) top = vec4(0.);
  if (uv.x + pixel_size.x >= 1. - border_factor * pixel_size.x) right = vec4(0.);
  if (uv.y - pixel_size.y <= border_factor * pixel_size.y) bottom = vec4(0.);

  // Diffusion
  vec2 scroll = vec2(sin(u_time * .01) * .5 + .5, 0.);
  vec4 diff_pattern1 = texture(u_blueNoise, uv * .01 + scroll);
  vec4 diff_pattern2 = random4(vec3(floor(ratio(uv, u_resolution) * floor(u_numLines)), floor(u_time * .1)));
  vec4 diff_pattern = mix(diff_pattern1, diff_pattern2, u_diffPattern);
  float sum = dot(vec4(1.), diff_pattern);
  vec3 factor = 2. * 0.016 * ((diff_pattern.r * left.rgb + diff_pattern.g * top.rgb + diff_pattern.b * right.rgb + diff_pattern.a * bottom.rgb) - sum * color.rgb);
  float minimum = .003;
  if (factor.r >= -minimum && factor.r < 0.0) factor.r = -minimum;
  if (factor.g >= -minimum && factor.g < 0.0) factor.g = -minimum;
  if (factor.b >= -minimum && factor.b < 0.0) factor.b = -minimum;
  color += factor;

  // UNCOMMENT TO RESET
  // color = vec3(0.);
  // color = diff_pattern.rgb;

  oColor = vec4(color, 1.);

#elif defined( BUFFER_1 )

  float alpha = texture2D(u_buffer0, uv).a;
  float impulse = expImpulse(fract(u_time * .1), 100.);

  // Chroma AB
  color = chromaAB(u_buffer0, uv, rotate(vec2(.1), u_time * .0, vec2(.5)), u_chromaAmount);

  // Hue
  vec3 hsv = rgb2hsv(color);
  hsv.z += .001;
  hsv.x += .00035;
  vec3 new_color = hsv2rgb(hsv);
  color = new_color;  

  oColor = vec4(color, 1.);

#elif defined( BUFFER_2 )

  color = gaussianBlur2D(u_buffer1, uv, .1 / u_resolution, 3).rgb;
  oColor = vec4(color, 1.);

#else

  // Post-Processing
  color = texture(u_buffer2, uv).rgb;
  float grain = grain(uv, u_resolution, u_time, 10.);
  float luma = rgb2luma(color);
  color += .05 * grain * (1. - smoothstep(0., .7, luma));
  color = mix(color, lut(color, u_lut_2), u_lutMix);
  color = contrast(color, u_contrast * 2.);
  color = desaturate(color, u_saturation);
  color = mix(color, vec3(1.), u_whiteMix);
  // color.g = 0.;
  oColor = vec4(color, 1.);

#endif  
  
}
