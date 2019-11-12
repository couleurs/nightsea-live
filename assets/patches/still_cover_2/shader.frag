#define texture2D(A,B) texture(A,B)

#include "../../shaders/glslLib/fx/grain.glsl"
#include "../../shaders/glslLib/color/contrast.glsl"
#include "../../shaders/glslLib/color/desaturate.glsl"
#include "../../shaders/glslLib/color/blend/all.glsl"
#include "../../shaders/glslLib/color/luma.glsl"
#include "../../shaders/glslLib/generative/snoise.glsl"

uniform float u_time;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_whiteMix;
uniform vec2 u_resolution;
uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;
uniform sampler2D u_still_ss;
uniform sampler2D u_still_ss_original;
uniform sampler2D u_still_ss_highres;
uniform sampler2D u_still_ss_highres_uncropped;

in vec2  vTexCoord0;
out vec4 oColor;

// Textures

// Parameters
uniform float u_photoYOffset;
uniform float u_texMultiplier;
uniform float u_noiseDistorsion;
uniform float u_grainAmount;

// Colors

#define NUM_LAYERS 10
#define NUM_RAYS 2
#define TWO_PI 6.283185
#define ORIGINAL_WIDTH 1600.
#define ORIGINAL_HEIGHT 1939.

float random(float n) { return fract(sin(n) * 43758.5453123); }

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 87.233)) ) * 43758.5453);
}

vec2 rotate(vec2 st, float radians) {
  float s = sin(radians);
  float c = cos(radians);
  mat2 mat = mat2(c, -s, s, c);
  return mat * st;
}

float circle(vec2 uv, float r) {
  float l = 1. - length(uv);
  return smoothstep(.5, mix(.9, 1.3, r), l);
}

float ray(vec2 uv, vec2 pos, vec2 dir, float speed, float frequency_1, float frequency_2) {
  vec2 ray_to_coord = uv - pos;
  float alpha = dot(normalize(ray_to_coord), dir);
  float r = .45 + .3 * sin(alpha * frequency_1 + u_time * speed)
          + .3 + .3 * cos(-alpha * frequency_2 + u_time * speed);          
  float attenuation = (1. - length(ray_to_coord)) * .0 + .3;  
  return clamp(r, 0., 1.) * attenuation;
}

void main() {
  vec2 uv = vTexCoord0;
  vec3 color = vec3(0.);

#ifdef BUFFER_0

  // CIRCLE LAYERS
  for (int j = 0; j < NUM_LAYERS; j++) {
    float f_j = float(j) / float(NUM_LAYERS);
    float r_j = random(f_j * 55.55 + 55.55);
    vec2 st = rotate(uv - .5, mix(0., TWO_PI, r_j));
    float size = mix(2., 10., r_j);
    vec2 uvs = fract(st * size) - .5;
    vec2 grid = floor(st * size) / size;
    float r = random(grid * 12.22 + 12.22);
    uvs.x *= mix(.8, 1.2, random(grid * 18.88 + 18.88));
    uvs.y *= mix(.8, 1.2, random(grid * 28.88 + 28.88));
    float sdf = circle(uvs, random(grid * 7.77 + 7.77));
    sdf *= step(.7, r);
    // color += vec3(sdf);
  }

  float f_num_rays = 1. / float(NUM_RAYS);
  for (int i = 0; i < NUM_RAYS; i++) {
    float f_i = float(i);
    float r = random(f_i);
    float ray_pos_x = mix(-.1, 1.3, sin(u_time * .01 ) * .5 + .5);
    vec2 ray_pos = vec2(.3, 1.) + mix(-.1, .1, r);
    vec2 ray_dir = vec2(-1., .5);
    float ray_speed = .8 + mix(-.1, .1, r);  
    float ray_freq_1 = 25.5 + mix(-10., 10., r);
    float ray_freq_2 = 39.2 + mix(-5., 10., r);
    color += f_num_rays * vec3(ray(uv, ray_pos, ray_dir, ray_speed, ray_freq_1, ray_freq_2));
  } 

#elif defined( BUFFER_1 )

  vec2 st = uv;  
  
  // Photo
  float ratio = ORIGINAL_WIDTH / ORIGINAL_HEIGHT;    
  float n = snoise(vec3(uv, u_time * .2));
  float yOffset = mix(0., 1. - ratio, u_photoYOffset);
  // uv.y *= ratio;
  color = texture2D(u_still_ss_highres_uncropped, vec2(uv.x, uv.y + yOffset) + n * u_noiseDistorsion).rgb;    
  color = texture2D(u_still_ss_highres_uncropped, vec2(uv.y, 1. - uv.x * .8)).rgb;  
  vec2 rot_uv = rotate(uv - .5, .25) + .5;

  // Ray blending
  vec3 rays = texture2D(u_buffer0, st).rgb;
  color += u_texMultiplier * rays * smoothstep(.1, 1, (1. - rot_uv.y)) * smoothstep(0., .7, uv.x);
  
  // Grain
  float g = grain(st, u_resolution, 0., 20.5);  
  vec3 mainColor = color;
  color = blendSoftLight(mainColor, vec3(g), u_grainAmount);
  float l = luma(mainColor);
  l = smoothstep(.05, .7, l);
  color = mix(color, mainColor, l);

  // color = vec3(l * l);

#else

  // Post-Processing
  color = texture(u_buffer1, uv).rgb;
  color = contrast(color, u_contrast * 2.);
  color = desaturate(color, u_saturation);
  color = mix(color, vec3(1.), u_whiteMix);

#endif  

  oColor = vec4(color, 1.);
}
