#define texture2D(A,B) texture(A,B)

#include "../../shaders/fb_lib/space/ratio.glsl"
#include "../../shaders/fb_lib/space/rotate.glsl"
#include "../../shaders/fb_lib/space/scale.glsl"
#include "../../shaders/fb_lib/math/const.glsl"
#include "../../shaders/fb_lib/math/lengthSq.glsl"
#include "../../shaders/fb_lib/color/blend/screen.glsl"
#include "../../shaders/fb_lib/color/blend/multiply.glsl"

#include "../../shaders/couleurs_lib/snoise.glsl"
#include "../../shaders/couleurs_lib/lut.glsl"

#include "../../shaders/glslLib/generative/random.glsl"
#include "../../shaders/glslLib/generative/gnoise.glsl"
#include "../../shaders/glslLib/filter/gaussianBlur/2D.glsl"
#include "../../shaders/glslLib/operation/stretch.glsl"
#include "../../shaders/glslLib/color/space/rgb2luma.glsl"
#include "../../shaders/glslLib/color/space/rgb2luma.glsl"
#include "../../shaders/glslLib/fx/chromaAB.glsl"


uniform sampler2D u_texRandom;
uniform sampler2D u_lookup_couleurs_bw;
uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;
uniform sampler2D u_buffer2;

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

// Parameters
uniform float u_density;
uniform float u_brightness;
uniform float u_lutMix;
uniform float u_sunBrightness;
uniform float u_sunScaleX;
uniform float u_sunPosX;
uniform float u_sunPosY;
uniform float u_particleScale;
uniform float u_verticalStretchAmount;
uniform float u_horizontalStretchAmount;

// Arrangement
// 1. Start at default
// 2. Bring it vertical lines, then horizontal
// 3. Pull back lines, bring u_density close to 3


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
  return color * 8 + vec3(.92, .95, 1.) * sdf_sun;
}

float dustLayer(sampler2D texRandom, vec2 st, float amount, int layer) {
  // Speed: the front layers go faster the back layers
  float normAmount = amount * .11;
  float particleTime = 1. + u_time * mix(10., 1.4712, normAmount) * .002;

  vec2 offset = st - .5;

  // Rotate
  offset = rotate(offset, snoise(vec2(normAmount, particleTime * .1)) * .5);

  // Scale to shape the particle
  offset *= vec2(u_particleScale);

  // Base Movement: downward + slight horizontal oscillation
  float phaseOffset = float(layer) * PI / 2.;
  offset += vec2(sin(particleTime + phaseOffset) * .1, particleTime * .1);

  // Pendulum movement: left-right oscillation
  vec2 randomMag = vec2(sin(particleTime * 1.1 + phaseOffset) * 2., cos(particleTime * 2. + phaseOffset) * 2.);
  vec2 xy = vec2(.2 * 1. / amount, .8 * 1. / amount);
  offset += vec2(xy.x * sin(xy.y), xy.x) * randomMag * 1.;

  // Scale to make front particles bigger than back ones
  vec2 uv = amount * offset;  
  return (texture(texRandom, fract(uv * .5)).x +
        	texture(texRandom, fract(uv * .25)).y) * .5;
}

#define PARTICLE_LAYERS 5
vec4 particlesDust() {
  vec2 st = ratio(vTexCoord0, u_resolution);
  vec3 color = vec3(0.);
	float depth = 1.;
	for (int i = 0; i < PARTICLE_LAYERS; i++) {
    float f = pow(depth, .15) + .5;
    float p = dustLayer(u_texRandom, st, f, i);
    p = pow(p, u_density - gnoise(u_time * .1) * 1.);
    color += smoothstep(.3, .9, p);
    depth += 10.;
	}
  return vec4(color, 1.) * vec4(vec3(.5), .1);
}

vec4 lens() {
  float s = u_sunScaleX;
  float t = sin(u_time * .1);
  vec2 st = scale(vTexCoord0, vec2(s, 1.));
  float posX = t * .2 + gnoise(u_time + 100.) * .05;
  vec2 sunPosition = vec2(posX, u_sunPosY);
  vec3 lensFlare = lensFlare(st, sunPosition);
  return vec4(lensFlare, 1.);
}

float expImpulse(float x, float k) {
    float h = k * x;
    return h * exp(1. - h);
}

float randomSize(float t, float offset) {
  return random(vec2(floor(t), offset));
}

vec2 randomPos(float t, float offset) {
  float x = random(vec2(floor(t), offset));
  float y = random(vec2(floor(t + 30.), offset));
  return mix(vec2(-.1), vec2(1.), vec2(x, y));
}

void main() {
  vec2 uv = vTexCoord0;

  #ifdef BUFFER_0

    // Circles
    vec2 st = ratio(uv, u_resolution);
    float t = u_time * .07;
    st *= randomSize(t, 10.);
    st -= .5;
    st += randomPos(t, 20.) * .5;
    float length = length(st);
    float growth = sin(fract(t) * 3.14);
    length = (1. - smoothstep(.0 + growth * .2, .2 + growth * .1, length)) * growth;

    // Particles
    vec3 color = particlesDust().rgb * u_brightness;      
    // color = mix(vec3(0.), color, 1. - length);    
    oColor = vec4(color, 1.);

    // oColor = vec4(vec3(length), 1.);

  #elif defined( BUFFER_1 )
 
    vec3 color = chromaAB(u_buffer0, uv, vec2(1.), .0);
    color = mix(color, lut(color, u_lookup_couleurs_bw), u_lutMix);
    oColor = vec4(color, 1.);

  #elif defined( BUFFER_2 )

    float sunBrightness = u_sunBrightness + gnoise(u_time) * .3;
    oColor = lens() * sunBrightness * 0.;

    float n = snoise(vec3(uv * 6., u_time * .1)) - .3;
    n = max(0., n);
    n = smoothstep(.3, .7, n);
    vec2 stretch_direction = n * 500. * u_horizontalStretchAmount * rotate(vec2(1., 0.), 0., vec2(0.));
    vec3 color = stretch(u_buffer1, uv, stretch_direction / u_resolution).rgb;
    // color = vec3(n);
    oColor = vec4(color, 1.);

  #else

    // Stretch sun
    float n = snoise(vec3(uv * 10., u_time * .1)) - .2;
    n = max(0., n);
    n = smoothstep(.3, .7, n);
    vec2 stretch_direction = n * 500. * u_verticalStretchAmount * rotate(vec2(0., 1.), 6.28 * expImpulse(fract(u_time * .1), 100.), vec2(0.));
    vec3 color = stretch(u_buffer2, uv, stretch_direction / u_resolution).rgb;
    // color = vec3(n);
    oColor = vec4(color, 1.);
  #endif  
}
