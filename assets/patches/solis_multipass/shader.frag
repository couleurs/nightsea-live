#include "../../shaders/fb_lib/space/ratio.glsl"
#include "../../shaders/fb_lib/animation/easing/sine.glsl"
#include "../../shaders/fb_lib/draw/circleSDF.glsl"
#include "../../shaders/fb_lib/space/scale.glsl"
#include "../../shaders/fb_lib/space/rotate.glsl"
#include "../../shaders/fb_lib/color/space/rgb2hsv.glsl"
#include "../../shaders/fb_lib/color/space/hsv2rgb.glsl"
#include "../../shaders/fb_lib/color/desaturate.glsl"
#include "../../shaders/fb_lib/color/levels/inputRange.glsl"
#include "../../shaders/fb_lib/color/levels/outputRange.glsl"
#include "../../shaders/fb_lib/math/map.glsl"
#include "../../shaders/fb_lib/math/const.glsl"
#include "../../shaders/fb_lib/generative/random.glsl"

#define GAUSSIANBLUR1D_SAMPLER_FNC(POS_UV) texture(tex, POS_UV)
#include "../../shaders/fb_lib/filter/gaussianBlur/1D.glsl"

#define CHROMAAB_SAMPLER_FNC(POS_UV) texture(tex,POS_UV)
#include "../../shaders/fb_lib/fx/chromaAB.glsl"

#include "../../shaders/couleurs_lib/snoise.glsl"
#include "../../shaders/couleurs_lib/lut.glsl"
#include "../../shaders/couleurs_lib/grain.glsl"

uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;
uniform sampler2D u_buffer2;
uniform sampler2D u_buffer3;
uniform sampler2D u_buffer4;
uniform sampler2D u_buffer5;

uniform sampler2D u_lookup_couleurs_bw;
uniform sampler2D u_lookup_shed_2;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_tick;
uniform float u_feedbackScale;
uniform float u_feedbackAmount;
uniform float u_feedbackBeat;
uniform float u_lutMix;
uniform float u_blurRadius;
uniform float u_grainAmount;
uniform float u_chromaAmount;
uniform float u_chromaSpeed;
uniform float u_sizeBeat;
uniform float u_redAmount;

in vec2  vTexCoord0;
out vec4 oColor;

void main() {  
#ifdef BUFFER_0

  vec2 st = ratio(vTexCoord0, u_resolution);
  float vignette = circleSDF(scale(st, mix(1., 1., sineInOut(u_tick))), (.0 * vec2(sin(u_time / 10.), cos(u_time / 10.)) + 1.) / 2.);
  oColor = vec4(vec3(vignette), 1.);

#elif defined( BUFFER_1 )

  vec4 source = texture(u_buffer0, vTexCoord0);
  vec2 st = vTexCoord0 + .1 * vec2(snoise(vec2(vTexCoord0.x, u_time / 5.)), snoise(vec2(vTexCoord0.y, u_time / 10.)));
  vec4 feedback = texture(u_buffer2, scale(st, u_feedbackScale));
  vec4 f_hsv = rgb2hsv(feedback);
  f_hsv.r += .3;
  vec4 f_rgb = hsv2rgb(f_hsv);
  float fb_max = mix(u_feedbackAmount, 1., u_feedbackBeat);
  oColor = mix(source, f_rgb, map(u_tick, 0., 1., u_feedbackAmount, fb_max));

#elif defined( BUFFER_2 )

  oColor = texture(u_buffer1, vTexCoord0);

#elif defined( BUFFER_3 )

  vec2 r = vec2(random(vTexCoord0), random(vTexCoord0 * 10.)) * 2. - 1.;
  vec4 color = texture(u_buffer2, vTexCoord0 + .1 * r);

  // Color palette
  vec4 newColor = color;
  newColor = lut(color, u_lookup_shed_2);

  // LUT
  newColor = lut(newColor, u_lookup_couleurs_bw);
	oColor = mix(color, newColor, u_lutMix);

  // Saturation
  oColor = vec4(mix(oColor.rgb, vec3(.5), .15), 1.);

#elif defined( BUFFER_4 )

  oColor = gaussianBlur1D(u_buffer3, vTexCoord0, vec2(u_blurRadius / u_resolution.x, 0.), 20);

#elif defined( BUFFER_5 )
  
  vec4 color = gaussianBlur1D(u_buffer4, vTexCoord0, vec2(0., u_blurRadius / u_resolution.y ), 20);

  // Grain
  vec4 grain = vec4(vec3(grain(vTexCoord0, u_resolution / 2.5, u_time / 2., 2.5)), 1.);
  oColor = color + grain * u_grainAmount;

#else

  vec2 direction = rotate(vec2(1.), u_time * u_chromaSpeed, vec2(.5));
  float sdf = dot(vTexCoord0 - .5, vTexCoord0 - .5);
  vec2 st = vTexCoord0;
  float chroma_max = mix(2.5, 2.8, u_sizeBeat);
  vec3 c = chromaAB(u_buffer5, st, direction * sdf * map(u_tick, 0., 1., 2.5, chroma_max), u_chromaAmount);
  oColor = vec4(c, 1.);  
  oColor = desaturate(oColor, -.5);

  oColor.r = mix(0., oColor.r, 1.);
  oColor = levelsInputRange(oColor, vec3(0.), vec3(1., 1., .01));
  oColor = levelsOutputRange(oColor, vec3(.25, mix(-.5, 0.5, u_redAmount), 0.), vec3(1., 1., 1.));
  
  oColor = mix(oColor, vec4(1.), .2);

#endif
}
