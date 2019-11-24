#include "../../shaders/fb_lib/space/scale.glsl"
#include "../../shaders/fb_lib/generative/random.glsl"
#include "../../shaders/fb_lib/color/blend/all.glsl"
#include "../../shaders/fb_lib/color/luma.glsl"

#include "../../shaders/couleurs_lib/grain.glsl"

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;

// Parameters
uniform float u_randomSeedCircle;
uniform float u_randomSeedSquare;
uniform float u_squareSize;
uniform float u_spread;
uniform float u_circleEdge;
uniform float u_sizeSpread;
uniform float u_additive;
uniform float u_squareThreshold;

#define NUM_CIRCLES 5

void main() {
  vec2 uv = vTexCoord0;
  vec3 c_bg = vec3(.133, .161, .224);
  vec3 c_fg = vec3(.306, .514, .549);
  vec3 pink = vec3(1.000, 0.914, 0.937);

  #ifdef BUFFER_0

    float r = random(vec3(floor(uv * mix(0., 100., u_squareSize)), u_randomSeedSquare));
    r = step(u_squareThreshold, r);
    vec3 color = mix(c_bg, c_fg, r);
    oColor = vec4(color, 1.);

  #elif defined(BUFFER_1)

    vec2 offset = vec2(random(uv * 2.), random(uv / 2.));
    oColor = texture(u_buffer0, uv + offset * 0.);
  
  #else

    float g = grain(uv, u_resolution, 1., 10.5);
    vec3 color = c_bg;// + g * .25;
    float circle_mask = 0.;
    vec3 b0 = texture(u_buffer1, uv).rgb;  
    for (int i = 0; i < NUM_CIRCLES; i++) {
      float f_i = float(i);
      float r1 = random(vec2(f_i * 50., u_randomSeedCircle));
      float r2 = (random(vec2(0., f_i * 5.)) - .5) * 2.;    
      float r3 = random(vec2(f_i * 10., -f_i));
      vec2 st = uv + u_spread * vec2((r1 - .5) * 2., r2);    
      float l = 1. - length(st - .5);
      float edge = .8 + r3 * .2 * u_sizeSpread;
      float w = u_circleEdge;
      float l1 = step(edge, l);
      float l2 = smoothstep(edge, edge + w, l);
      l = l1 - l2;

      // vec3 c = vec3(pow(l, 5.) * vec3(0.306, 0.514, 0.549)) + l2 * b0;
      // float a = (f_i + 1.) * l1;     
      // color = mix(color, vec4(c, a), step(color.a, a));
      
      vec3 c = vec3(pow(l, 5.) * c_fg) + l2 * b0;
      color += c * u_additive;
      circle_mask += l1;
    }

    // Grain
    float l = luma(color);
    color += g * mix(.2, .3, l); // .3 instead of .5 usually

    // Pink Mix
    l = luma(color);
    color = mix(color, pink, smoothstep(.5, .9, l) * .75);

    // White Mix for BG
    circle_mask = clamp(0., 1., circle_mask);
    // color = mix(color, vec3(1.), .05 * (1. - circle_mask));

    oColor = vec4(color, 1.);   

    // oColor = vec4(vec3(1. - circle_mask), 1.);

  #endif
      
}
