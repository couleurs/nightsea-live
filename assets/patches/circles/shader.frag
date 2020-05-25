#define texture2D(A,B) texture(A,B)

#include "../../shaders/glslLib/color/contrast.glsl"
#include "../../shaders/glslLib/color/desaturate.glsl"
#include "../../shaders/glslLib/generative/random.glsl"
#include "../../shaders/glslLib/generative/gnoise.glsl"
#include "../../shaders/glslLib/color/space/rgb2hsv.glsl"
#include "../../shaders/glslLib/color/space/hsv2rgb.glsl"
#include "../../shaders/glslLib/color/space/rgb2luma.glsl"
#include "../../shaders/couleurs_lib/lut.glsl"
#include "../../shaders/couleurs_lib/grain.glsl"

uniform float u_time;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_whiteMix;
uniform vec2 u_resolution;
uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;

in vec2  vTexCoord0;
out vec4 oColor;

// Textures
uniform sampler2D u_syphonTex;
uniform sampler2D u_blueNoise;
uniform sampler2D u_lut;

// Parameters
uniform float u_speed;
uniform float u_intensity;
uniform float u_size;
uniform float u_count;
uniform float u_hueShift;
uniform float u_diffPattern;
uniform float u_numLines;
uniform float u_lutMix;

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

#define NUM_COLORS 2
vec3 COLOR_MASKS[NUM_COLORS] = vec3[]( vec3(0.227, 0.639, 1.000),
                                       vec3(1.000, 0.227, 0.266)                                       
                                    );
vec3 randomColor(float t, float speed) {
  int index = int(floor(random(floor(t * speed)) * float(NUM_COLORS)));
  return COLOR_MASKS[index];
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

    
  color = texture(u_buffer1, uv).rgb;
  vec2 pixel_size = uv / u_resolution;
  float impulse = expImpulse(fract(u_time * .1), 100.);

  int num = int(u_count + impulse * 15.);
  for (int i = 0; i < num; i++) {
    float f_i = float(i);
    vec2 pos = randomPos(u_time + f_i * 100., random(f_i)) + mix(vec2(-.5), vec2(.5), noiseDisplacement(u_time + f_i * 50., u_speed));
    vec2 mouse_xy = pos * u_resolution;
    float dist = distance(mouse_xy, uv * u_resolution);
    color += randomColor(u_time + f_i * 20., 1.) * u_intensity * (1. - step(u_size, dist));
  }
  
  // Reset
  // color = vec3((1. - smoothstep(0., 150., dist)));

  vec4 left = texture(u_buffer1, uv + vec2(-pixel_size.x, 0.));
  vec4 top = texture(u_buffer1, uv + vec2(0., pixel_size.y));
  vec4 right = texture(u_buffer1, uv + vec2(pixel_size.x, 0.));
  vec4 bottom = texture(u_buffer1, uv + vec2(0., -pixel_size.y));  

  // Borders
  float border_factor = 10.;
  if (uv.x - pixel_size.x <= border_factor * pixel_size.x) left = vec4(0.);
  if (uv.y + pixel_size.y >= 1. - border_factor * pixel_size.y) top = vec4(0.);
  if (uv.x + pixel_size.x >= 1. - border_factor * pixel_size.x) right = vec4(0.);
  if (uv.y - pixel_size.y <= border_factor * pixel_size.y) bottom = vec4(0.);

  // Diffusion
  vec2 scroll = vec2(sin(u_time * .01) * .5 + .5, 0.);
  vec4 diff_pattern1 = texture(u_blueNoise, uv * .01 + scroll);
  vec4 diff_pattern2 = random4(vec2(0., floor(uv.y * floor(u_numLines)) + floor(u_time * .5)));
  vec4 diff_pattern = mix(diff_pattern1, diff_pattern2, u_diffPattern);
  float sum = dot(vec4(1.), diff_pattern);
  vec3 factor = 2. * 0.016 * ((diff_pattern.r * left.rgb + diff_pattern.g * top.rgb + diff_pattern.b * right.rgb + diff_pattern.a * bottom.rgb) - sum * color.rgb);
  float minimum = .003;
  if (factor.r >= -minimum && factor.r < 0.0) factor.r = -minimum;
  if (factor.g >= -minimum && factor.g < 0.0) factor.g = -minimum;
  if (factor.b >= -minimum && factor.b < 0.0) factor.b = -minimum;
  color += factor;

  vec3 hsv = rgb2hsv(color);
  float factor_sum = dot(vec3(1.), factor) / 3.;
  hsv.x += factor_sum * sin(u_time * .1) * u_hueShift;
  vec3 new_color = hsv2rgb(hsv);
  color = new_color; 

  // UNCOMMENT TO RESET
  // color = vec3(0.);
  // color = diff_pattern.rgb;
  // color = vec3(expImpulse(fract(u_time * .1), 100.));

#elif defined( BUFFER_1 )

  color = texture(u_buffer0, uv).rgb;

#else

  // Post-Processing
  color = texture(u_buffer0, uv).rgb;
  float grain = grain(uv, u_resolution, u_time, 10.);
  float luma = rgb2luma(color);
  color += .05 * grain * (1. - smoothstep(0., .7, luma));
  color = mix(color, lut(color, u_lut), u_lutMix);
  color = contrast(color, u_contrast * 2.);
  color = desaturate(color, u_saturation);
  color = mix(color, vec3(1.), u_whiteMix);

#endif  

  oColor = vec4(color, 1.);
}
