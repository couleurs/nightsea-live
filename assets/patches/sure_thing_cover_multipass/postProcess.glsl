#include "../../shaders/fb_lib/color/contrast.glsl"
#include "../../shaders/fb_lib/color/desaturate.glsl"

#include "../../shaders/couleurs_lib/grain.glsl"
#include "../../shaders/couleurs_lib/snoise.glsl"

#include "../../shaders/couleurs_lib/lut.glsl"

#include "../../shaders/fb_lib/space/ratio.glsl"
#include "../../shaders/fb_lib/space/scale.glsl"
#include "../../shaders/fb_lib/space/rotate.glsl"

#include "../../shaders/fb_lib/draw/rectSDF.glsl"
#include "../../shaders/fb_lib/math/const.glsl"

uniform float u_grainAmount;
uniform float u_saturation;
uniform float u_lutMix;
uniform float u_globalFade;
uniform float u_mask;

vec4 postProcess(sampler2D texInput, sampler2D texLUT, sampler2D texMask, vec2 uv, vec2 resolution, float t) {
  float mask = texture(texMask, uv).a * u_mask;
  vec2 st = rotate(uv, mix(0., 1., mask));
  st = uv + mix(0., .1, mask);
  vec3 color = texture(texInput, st).rgb;
  color = mix(color, vec3(0.), u_globalFade);
  vec3 grain = vec3( grain( uv, resolution / 2.5, t / 2., 2.5 ) );
  color += grain * u_grainAmount;

  vec3 newColor = lut(color, texLUT);
  color = mix(color, newColor, u_lutMix);

  color = contrast(color, 1.15);
  color = desaturate(color, mix(.25, -.75, u_saturation));
  color += .02;    

  return vec4(color, 1.);    
}
