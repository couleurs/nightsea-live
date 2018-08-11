// #include "../../shaders/fb_lib/fx/lensFlare.glsl"
#include "../../shaders/fb_lib/space/ratio.glsl"
#include "../../shaders/fb_lib/space/rotate.glsl"
#include "../../shaders/fb_lib/space/scale.glsl"
#include "../../shaders/fb_lib/math/const.glsl"
#include "../../shaders/fb_lib/math/lengthSq.glsl"
#include "../../shaders/fb_lib/color/blend/screen.glsl"
#include "../../shaders/fb_lib/color/blend/multiply.glsl"

#include "../../shaders/couleurs_lib/snoise.glsl"
#include "../../shaders/couleurs_lib/lut.glsl"

uniform sampler2D u_texRandom;
uniform sampler2D u_lookup_couleurs_bw;
uniform sampler2D u_buffer0;

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

vec3 lensFlare(vec2 st, vec2 sun_pos) {
  st = st - .5;
  vec2 st_sun = st - sun_pos;
  float sdf = lengthSq(st_sun);

  // Sun
  float dist = pow(length(3.8 * st_sun), 1.5);
  float sdf_sun = 1. / (dist + 2.);
  sdf_sun += sdf_sun / dist * .25;

  // Halo
  vec2 st_halo = st * sdf;
  vec3 halo = vec3(max(1. / (1. + 32. * lengthSq(st_halo + .8 * sun_pos)),.0) * .125,
                   max(1. / (1. + 32. * lengthSq(st_halo + .85 * sun_pos)),.0) * .123,
                   max(1. / (1. + 32. * lengthSq(st_halo + .9 * sun_pos)),.0) * .121);

  // Flares (from the halo to the sun)
  vec2 uvx = mix(st, st_halo, -.5);
  vec3 flare1 = vec3( max(.01 - lengthSq(uvx + .7 * sun_pos) * 5., .0),
                      max(.01 - lengthSq(uvx + .75 * sun_pos) * 5., .0),
                      max(.01 - lengthSq(uvx + .8 * sun_pos) * 5., .0) * 2.);


  uvx = mix(st, st_halo, -.4);
  vec3 flare2 = vec3( max(.01 - lengthSq(uvx + .3 * sun_pos) * 10., .0) * 3.,
                      max(.01 - lengthSq(uvx + .35 * sun_pos) * 10., .0)* 5.,
                      max(.01 - lengthSq(uvx + .4 * sun_pos) * 10., .0)* 3.);


  uvx = mix(st, st_halo, -.5);
  vec3 flare3 = vec3( max(.01 - lengthSq(uvx - .3 * sun_pos) * 30., .0) * 10.,
                      max(.01 - lengthSq(uvx - .325 * sun_pos) * 30., .0) * 8.,
                      max(.01 - lengthSq(uvx - .35 * sun_pos) * 30., .0) * 10.);

  vec3 color = vec3(0.);
  color += halo * halo * 4.;
  // color += flare1 * 2.;
  // color += flare2;
  // color += flare3;
  // return color * 5. + vec3(1., .853, .913) * sdf_sun;
  return color * 5. + vec3(.92, .95, 1.) * sdf_sun;
}

float dustLayer(sampler2D texRandom, vec2 st, float amount, int layer) {
  // Speed: the front layers go faster the back layers
  float normAmount = amount * .11;
  float particleTime = 1. + u_time * mix(10., 1.4712, normAmount) * .002;

  vec2 offset = st;

  // Rotate
  offset = rotate(offset, snoise(vec2(normAmount, particleTime * .1)) * .5);

  // Scale to shape the particle
  offset *= vec2(1.);

  // Base Movement: downward + slight horizontal oscillation
  float phaseOffset = float(layer) * PI / 2.;
  offset += vec2(sin(particleTime + phaseOffset) * .1, particleTime * .1);

  // Pendulum movement: left-right oscillation
  vec2 randomMag = vec2(sin(particleTime * 1.1 + phaseOffset) * 2., cos(particleTime * 2. + phaseOffset) * 2.);
  vec2 xy = vec2(.2 * 1. / amount, .8 * 1. / amount);
  offset += vec2(xy.x * sin(xy.y), xy.x) * randomMag * 1.;

  // Scale to make front particles bigger than back ones
  vec2 uv = amount * offset;

  return (texture(texRandom, fract(uv * .6)).x +
        	texture(texRandom, fract(uv * .25)).y) * .5;
}

#define PARTICLE_LAYERS 10
vec4 particlesDust() {
  vec2 st = ratio(vTexCoord0, u_resolution);
  vec3 color = vec3(0.);
	float depth = 1.;
	for (int i = 0; i < PARTICLE_LAYERS; i++) {
    float f = pow(depth, .15) + .5;
    float p = dustLayer(u_texRandom, st * 1., f, i);
    p = pow(p, 3.5);
    color += smoothstep(.3, .9, p);
    depth += 10.;
	}
  return vec4(color, 1.) * vec4(vec3(.5), .1);
}

vec4 lens() {
  float s = .3;
  vec2 st = scale(vTexCoord0, vec2(s, 1.));
  vec2 sunPosition = scale(vec2(.0, .57), 1.);
  vec3 lensFlare = lensFlare(st, sunPosition);
  return vec4(lensFlare, 1.);
}

void main() {
  #ifdef BUFFER_0
    // vec3 color = blendMultiply(lens().rgb * 1.5, particlesDust().rgb, 1.);
    vec3 color = lens().rgb * .0 + particlesDust().rgb * 1.;
    color = mix(color, vec3(1.), .02);
    oColor = lut(vec4(color, 1.), u_lookup_couleurs_bw);
    // oColor = vec4(color, 1.);
  #else
    oColor = lens() + texture(u_buffer0, vTexCoord0);
  #endif  
}
