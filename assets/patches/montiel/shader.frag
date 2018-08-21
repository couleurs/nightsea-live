#include "../../shaders/couleurs_lib/snoise.glsl"

#include "../../shaders/fb_lib/generative/random.glsl"
#include "../../shaders/fb_lib/space/cartesian2polar.glsl"
#include "../../shaders/fb_lib/space/rotate.glsl"
#include "../../shaders/fb_lib/math/const.glsl"
#include "../../shaders/fb_lib/math/mirror.glsl"
#include "../../shaders/fb_lib/math/within.glsl"
#include "../../shaders/fb_lib/animation/easing/sine.glsl"

#define GAUSSIANBLUR1D_TYPE vec3
#define GAUSSIANBLUR1D_SAMPLER_FNC(POS_UV) texture(tex, POS_UV).rgb
#include "../../shaders/fb_lib/filter/gaussianBlur/1D.glsl"

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;
uniform sampler2D u_buffer2;

// Parameters
uniform float u_speed;
uniform float u_noiseBase;
uniform float u_noiseScale;
uniform float u_noiseInput;
uniform float u_blurRadius;
uniform float u_randomAmount;

void main() {
  vec2 uv = vTexCoord0;

#ifdef BUFFER_0

  vec3 color = vec3(0.);

  // SDF
  vec2 st = uv - .5;
  // st -= vec2(.2);
  float sdf = length(st);

  // Angle
  // st += .5;
  // st = rotate(st, PI / 3.5);
  float angle = (cartesian2polar(uv).y + PI) / PI;
  // angle = mirror(angle);
  angle = sineInOut(angle);  

  float noise = u_noiseScale * (snoise(vec2(angle / u_noiseInput, u_time * u_speed)) + 1.) / 2.;
  // angle = 1. - smoothstep(.0, .4, sqrt(angle));
  sdf = smoothstep(0., u_noiseBase + noise, sdf);
  // sdf = smoothstep(0., .5, sdf);
  color = vec3(sdf);

  oColor = vec4(color, noise);

#elif defined(BUFFER_1)

  float a = texture(u_buffer0, uv).a;  
  vec3 color = gaussianBlur1D(u_buffer0, uv, vec2(a * u_blurRadius / u_resolution.x, 0.), 20);
  oColor = vec4(color, a);

#elif defined(BUFFER_2)

  float a = texture(u_buffer0, uv).a;
  vec3 color = gaussianBlur1D(u_buffer1, uv, vec2(0., a * u_blurRadius / u_resolution.y), 20);  
  oColor = vec4(color, a);

#else
  
  float s = texture(u_buffer0, uv).r;
  // s = sineInOut(s);
  vec2 r = vec2(random(vTexCoord0), random(vTexCoord0 * 10.)) * 2. - 1.;
  vec3 color = texture(u_buffer2, uv + u_randomAmount * s * r).rgb;
  oColor = vec4(color, 1.);

  // pick colors?
  // find smoother transition from to background? not necessary
  // remove noise and open the blur just at a certain angle? difficult, different project
  // oColor = vec4(vec3(s), 1.);
  

#endif
    
}
