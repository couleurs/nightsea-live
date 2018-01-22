#version 330

#include "../../headers/common_header.glsl"
#include "../../fb_lib/math/const.glsl"
#include "../../couleurs_lib/snoise.glsl"
#include "../../fb_lib/space/scale.glsl"
#include "../../fb_lib/color/luma.glsl"

const float octaves = 8.0;
const vec2 globalVelocity = vec2(6.0, 8.0);

uniform sampler2D u_texInput;

float hash11(float p) {
  const float HASHSCALE1 = .1031;
	vec3 p3  = fract(vec3(p) * HASHSCALE1);
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.x + p3.y) * p3.z);
}

float getAmplitude(float octave){
  return 1. / pow(2., octave);
}

float getWavelength(float octave) {
  const float maximumWavelength = .05;
  float wavelength = TAU * maximumWavelength / pow(2., octave);

  // Make it aperiodic with a random factor
  wavelength *= .75 + .5 * hash11(1.337 * octave);
  return wavelength;
}

float getSpeed(float octave) {
  const float speedScaleFactor = 2.;

  // Smallest waves travel twice as fast as given velocity,
  // largest waves travel half as fast
  const vec2 speedRange = vec2(2., .5);

  // Map octave to speed range
  float speed = speedScaleFactor * mix(speedRange.x, speedRange.y, octave / (max(1., octaves - 1.)));

  // Add some randomness
  speed *= .5 + hash11(1.337 * octave);

  return speed;
}

float getHeight(vec2 position, vec2 velocity) {
  // float magnitude = length(velocity);
  // vec2 direction = (magnitude > 1e-5) ? velocity / magnitude : vec2(0.0);
  float height = 0.;

  for (float octave = 0.; octave < octaves; octave += 1.) {
    float amplitude = getAmplitude(octave);
    float wavelength = getWavelength(octave);
    float speed = 1. * getSpeed(octave) * .1;
    float frequency = TAU / wavelength;
    float randomPhaseOffset = hash11(1.337 * octave) * TAU;
    float phase = speed * frequency + randomPhaseOffset;
    // float theta = dot(-direction, position);
    float theta = position.y;
    height += amplitude * sin(theta * frequency + u_time * phase);
  }
  return height;
}

vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
  return a + b*cos( 6.28318*(c*t+d) );
}



void main() {
  float h = getHeight(vTexCoord0, globalVelocity);
  // vec3 c = palette(h, vec3(.5, .5, .5), vec3(.5, .5, .5), vec3(2., 1., .0), vec3(.5, .2, .25));
  // oColor = vec4(vec3(.25 * h + .5), 1.);
  // oColor = vec4(vec3(sin(vTexCoord0.x)), 1.);
  // oColor = vec4(1., 0., 0., 1.);
  vec4 c_input = texture(u_texInput, vTexCoord0);
  float l = luma(c_input);
  vec2 st = vTexCoord0 + mix(.05, .4, pow(l, .1)) * vec2(snoise(vTexCoord0 * .1), snoise(vTexCoord0 * 1.));
  st = scale(st, .9);
  oColor = texture(u_texInput, st);

}
