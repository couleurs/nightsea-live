#include "../../shaders/fb_lib/space/scale.glsl"
#include "../../shaders/fb_lib/space/ratio.glsl"
#include "../../shaders/fb_lib/space/rotate.glsl"
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

#define NUM_CIRCLES 15

vec2 randomPos(float t, float offset) {
  float x = random(vec2(floor(t), offset));
  float y = random(vec2(floor(t + 30.), offset));
  return mix(vec2(-.1), vec2(1.), vec2(x, y));
}

vec2 randomDir(float t, float offset) {
  float x = random(vec2(floor(t), offset));
  float y = random(vec2(floor(t + 10.), offset));
  return normalize(mix(vec2(-1.), vec2(1.), vec2(x, y)));
}

float expImpulse( float x, float k ) {
  float h = k * x;
  return h * exp(1. - h);
}

void main() {
  vec2 uv = vTexCoord0;
  vec3 c_bg = vec3(.133, .161, .224);
  vec3 c_fg = vec3(.306, .514, .549);
  vec3 pink = vec3(1.000, 0.914, 0.937);
  float squares_t = u_time * .05 + 100.;  

  #ifdef BUFFER_0
    
    uv = ratio(uv, u_resolution);
    float big_squares = random(vec3(floor(uv * mix(0., 100., u_squareSize)), floor(squares_t)));
    big_squares = step(u_squareThreshold, big_squares) * (sin(fract(squares_t) * 3.14) + random(u_time) * .2);

    float r1_t = u_time * .02 + 11.;
    float r1 = step(.99, random(vec3(floor(uv * 9.), floor(r1_t))));
    r1 *= sin(fract(r1_t) * 3.14) + random(vec2(u_time, 0.)) * .2;

    float r2_t = u_time * .03 - 11.;
    float r2 = step(.99, random(vec3(floor(uv * 11), floor(r2_t))));
    r2 *= sin(fract(r2_t) * 3.14) + random(vec2(u_time, 10.)) * .2;;

    float r3_t = u_time * .04 + 33.;
    float r3 = step(.99, random(vec3(floor(uv * 13), floor(r3_t))));    
    r3 *= sin(fract(r3_t) * 3.14) + random(vec2(u_time, 20.)) * .2;;

    float small_squares = min(2., r1 + r2 + r3);    

    vec3 color = mix(c_bg, c_fg, small_squares);
    color = vec3(big_squares, small_squares, 0.);
    oColor = vec4(color, 1.);

  #elif defined(BUFFER_1)

    vec2 offset = vec2(random(uv * 2.), random(uv / 2.));
    oColor = texture(u_buffer0, uv + offset * 0.);
  
  #else
    
    vec2 ratio_uv = ratio(uv, u_resolution);
    vec3 color = c_bg;// + g * .25;
    float circle_mask = 0.;
    float trans_t = u_time * .01 + 50.;
    float random_rot = random(floor(squares_t));
    float rot_angle = random_rot * 6.28 + mix(-1., 1., step(.5, random_rot)) * u_time * .02;
    float b0 = texture(u_buffer1, rotate(ratio_uv + fract(trans_t), rot_angle)).r;  
    float b1 = texture(u_buffer1, uv).g;
    vec3 squares = mix(c_bg, c_fg, min(2., b0 + b1));    
    for (int i = 0; i < NUM_CIRCLES; i++) {
      float f_i = float(i);
      float r1 = random(vec2(f_i * 50., u_randomSeedCircle));
      float r2 = random(vec2(0., f_i * 5.));    
      float r3 = random(vec2(f_i * 10., -f_i));
      float t = fract(u_time * .03 + f_i / 10.);
      vec2 st = ratio_uv + randomDir(t, f_i * 10.) * (.001, .1, t);    
      float l = 1. - length(st - .5 + randomPos(t, f_i * 10.));
      float edge = mix(.4, .9, r1) + r3 * .2 * u_sizeSpread + random(u_time) * .001;
      float w = u_circleEdge;
      float l1 = smoothstep(edge - .01, edge, l);
      float l2 = smoothstep(edge, edge + w, l);
      l = l1 - l2;
      vec3 c = vec3(pow(l, 5.) * c_fg) + l2 * squares;
      float impulse = expImpulse(fract(u_time * .2), 80.);
      color += c * mix(0., u_additive, sin(t * 3.14)) * (1. + random(vec2(u_time, f_i * 20.)) * (.2 + step(.6, r2) * 2. * impulse));
      circle_mask += l1;
    }

    // Grain
    float l = luma(color);

    // Pink Mix
    l = luma(color);
    color = mix(color, pink, smoothstep(.5, .9, l) * .75);

    // White Mix for BG
    circle_mask = clamp(0., 1., circle_mask);
    // color = mix(color, vec3(1.), .05 * (1. - circle_mask));

    // color = squares;
    oColor = vec4(color, 1.);   

    // oColor = vec4(vec3(1. - circle_mask), 1.);

  #endif
      
}
