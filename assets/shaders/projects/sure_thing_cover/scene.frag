#version 330

#include "../../headers/common_header.glsl"
#include "../../fb_lib/space/ratio.glsl"
#include "../../fb_lib/space/rotate.glsl"
#include "../../fb_lib/generative/snoise.glsl"
#include "../../fb_lib/math/const.glsl"

const float particleDepthIncrementExponent = .1;
const float particleSmoothstepLeftEdge = .1;
const float particleSmoothstepRightEdge = .9;
// const float particleVisibility = .3; // param between .3 and .4
const float particleResultExponent = 2.2;
const float particleDepthLayerIncrement = 10.;
// const float particleSpeed = .013; // param between .003 and .013
const float particleRotateAmount = .5;
const float particleBaseTranslateXAmount = .5;
// const float particleBaseTranslateYSpeed = 10.5; // param between 10.5 and .5
const float particlePendulumYCoeff = 3.;
const float particlePendulumTranslateAmount = 1.;
const float particleSamplingX = .6;
const float particleSamplingY = .25;
const float particleSamplingCoeff = .45;
// const float particlePreScale = .015; // param between .015 and .05

uniform sampler2D u_texRandom;
uniform float u_particleBaseTranslateYSpeed;
uniform float u_particleSpeed;
uniform float u_particlePreScale;
uniform float u_particleVisibility;

float particleLayer(sampler2D texRandom, vec2 st, float amount, int layer) {
  // Speed: the front layers go faster the back layers
  float normAmount = amount * .11;
  // float particleSpeed = 0.003;//mix(.003, .013, u_particleSpeed);
  float particleSpeed = mix(.003, .02, 1. - u_particleBaseTranslateYSpeed);
  float particleTime = 1. + u_time * mix(10., 1.4712, normAmount) * particleSpeed;

  vec2 offset = st;

  // Rotate
  offset = rotate(offset, snoise(vec2(normAmount, particleTime * .1)) * particleRotateAmount);

  // Scale to shape the particle
  offset *= vec2(1.);

  // Base Movement: downward + slight horizontal oscillation
  float phaseOffset = float(layer) * PI / 4.;
  float particleBaseTranslateYSpeed = mix(.5, 10.5, u_particleBaseTranslateYSpeed);
  offset += vec2(sin(particleTime + phaseOffset) * particleBaseTranslateXAmount,
                 particleTime * particleBaseTranslateYSpeed);

  // Pendulum movement: left-right oscillation
  vec2 randomMag = vec2(sin(particleTime * 1.1 + phaseOffset) * 2.,
                        cos(particleTime * 2. + phaseOffset) * particlePendulumYCoeff);
  vec2 xy = vec2(.2 * 1. / amount,
                 .8 * 1. / amount);
  offset += vec2(xy.x * sin(xy.y), xy.x) * randomMag * particlePendulumTranslateAmount;

  // Scale to make front particles bigger than back ones
  vec2 uv = amount * offset;

  return (texture(texRandom, fract(uv * particleSamplingX)).x +
        	texture(texRandom, fract(uv * particleSamplingY)).y) * particleSamplingCoeff;
}

#define PARTICLE_LAYERS 5
vec4 particles() {
  vec2 st = ratio(vTexCoord0, u_resolution);
  vec3 color = vec3(0.);
	float depth = 1.;
	for (int i = 0; i < PARTICLE_LAYERS; i++) {
    float f = pow(depth, particleDepthIncrementExponent) + .5;
    float particlePreScale = mix(.02, .05, u_particlePreScale);
    float p = particleLayer(u_texRandom, st * particlePreScale, f, i);
    p = pow(p, particleResultExponent);
    color += smoothstep(particleSmoothstepLeftEdge, particleSmoothstepRightEdge, p);
    depth += particleDepthLayerIncrement;
	}
  float particleVisibility = mix(.3, .4, u_particleVisibility);
  return vec4(color, 1.) * particleVisibility;
}

void main() {
  oColor = particles();
  // oColor = texture(u_texRandom, vTexCoord0);
}
