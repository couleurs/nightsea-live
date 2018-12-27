#define texture2D(A,B) texture(A,B)

#include "../../shaders/glslLib/color/contrast.glsl"
#include "../../shaders/glslLib/color/desaturate.glsl"

#include "../../shaders/glslLib/generative/random.glsl"
#include "../../shaders/glslLib/generative/gnoise.glsl"

#include "../../shaders/glslLib/draw/rectSDF.glsl" 

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

// Parameters
uniform float u_rayYPos;

// Colors

float ray(vec2 uv, vec2 pos, vec2 dir, float speed, float frequency_1, float frequency_2) {
  vec2 ray_to_coord = uv - pos;
  float alpha = dot(normalize(ray_to_coord), dir);
  float r = .45 + .3 * sin(alpha * frequency_1 + u_time * speed)
          + .3 + .3 * cos(-alpha * frequency_2 + u_time * speed);          
  float attenuation = (1. - length(ray_to_coord)) * .7 + .3;  
  return clamp(r, 0., 1.) * attenuation;
}

#define NUM_RAYS 2

void main() {
  vec2 uv = vTexCoord0;
  vec3 color = vec3(0.);  

#ifdef BUFFER_0

  // Background
  color = vec3(.0, .118, .263) * 1.5;

  // Camera movement
  vec2 st = uv * mix(.95, 1.05, gnoise(u_time * .1));
  st.x += mix(-.04, .03, gnoise(u_time * .07 + 32.)); 
  st.x += mix(-.02, .03, gnoise(u_time * .09 + 112.)); 

  // Rays
  float f_num_rays = 1. / float(NUM_RAYS);
  for (int i = 0; i < NUM_RAYS; i++) {
    float f_i = float(i);
    float r = random(f_i);
    float ray_pos_x = .8; //mix(-.1, 1.3, sin(u_time * .01 ) * .5 + .5);
    vec2 ray_pos = vec2(ray_pos_x, u_rayYPos) + mix(-.1, .1, r);
    vec2 ray_dir = vec2(-1., .5);
    float ray_speed = .8 + mix(-.1, .1, r);  
    float ray_freq_1 = 25.5 + mix(-10., 10., r);
    float ray_freq_2 = 39.2 + mix(-5., 10., r);
    color += f_num_rays * vec3(ray(st, ray_pos, ray_dir, ray_speed, ray_freq_1, ray_freq_2));
  }  
  
  float depth = uv.y;
  color.r *= .0 + depth * 1.5;

#elif defined( BUFFER_1 )

  float r = random(uv);
  float depth = (1 - uv.y) * .6;
  color = texture2D(u_buffer0, uv + r * .03 * depth).rgb;
  // color.rgb = vec3(depth);

#else

  // Post-Processing
  color = texture(u_buffer1, uv).rgb;
  color = contrast(color, u_contrast * 2.);
  color = desaturate(color, u_saturation);
  color = mix(color, vec3(1.), u_whiteMix);

#endif  

  oColor = vec4(color, 1.);
}
