#define texture2D(A,B) texture(A,B)

#include "../../shaders/glslLib/color/contrast.glsl"
#include "../../shaders/glslLib/color/desaturate.glsl"
#include "../../shaders/fb_lib/generative/snoise.glsl"
#include "../../shaders/glslLib/generative/random.glsl"
#include "../../shaders/glslLib/generative/gnoise.glsl"
#include "../../shaders/glslLib/space/rotate.glsl"

uniform float u_time;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_whiteMix;
uniform vec2 u_resolution;
uniform sampler2D u_buffer0;

in vec2  vTexCoord0;
out vec4 oColor;

// Textures
uniform sampler2D u_cover;

// Parameters

// Colors

float ray(vec2 uv, vec2 pos, vec2 dir, float speed, float frequency_1, float frequency_2) {
  vec2 ray_to_coord = uv - pos;
  float alpha = dot(normalize(ray_to_coord), dir);
  float r = .45 + .3 * sin(alpha * frequency_1 + u_time * speed)
          + .3 + .3 * cos(-alpha * frequency_2 + u_time * speed);          
  float attenuation = (1. - length(ray_to_coord)) * .0 + .3;  
  return clamp(r, 0., 1.) * attenuation;
}

#define NUM_RAYS 2

void main() {
  vec2 uv = vTexCoord0;
  vec3 color = vec3(0.);

#ifdef BUFFER_0

  // Code here :)
  float n = snoise(vec3(uv, u_time * .2));
  color = texture2D(u_cover, vec2(uv.x, uv.y + .08) + n * .025).rgb;

  // Rays
  float f_num_rays = 1. / float(NUM_RAYS);
  vec3 rays = vec3(0.);
  for (int i = 0; i < NUM_RAYS; i++) {
      float f_i = float(i);
      float r = random(f_i);
      float ray_pos_x = mix(-.1, 1.3, sin(u_time * .01 ) * .5 + .5);
      vec2 ray_pos = vec2(.2, 1.2) + mix(-.1, .1, r);
      vec2 ray_dir = vec2(-1., .5);
      float ray_speed = .5 + mix(-.1, .1, r);  
      float ray_freq_1 = 25.5 + mix(-10., 10., r);
      float ray_freq_2 = 39.2 + mix(-5., 10., r);
      rays += f_num_rays * vec3(ray(uv, ray_pos, ray_dir, ray_speed, ray_freq_1, ray_freq_2));
  } 

  vec2 rot_uv = rotate(uv - .5, .25) + .5;  
  rays = clamp(rays, 0., 1.);
  rays *= smoothstep(0., .2, uv.x) * smoothstep(.1, 1., (1. - rot_uv.y));
  rays = smoothstep(0., .8, rays);
  color += mix(.2, .3, gnoise(u_time)) * rays;

#else

  // Post-Processing
  color = texture(u_buffer0, uv).rgb;
  color = contrast(color, u_contrast * 2.);
  color = desaturate(color, u_saturation);
  color = mix(color, vec3(1.), u_whiteMix);

#endif  

  oColor = vec4(color, 1.);
}
