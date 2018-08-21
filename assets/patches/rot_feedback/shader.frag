#include "../../shaders/fb_lib/draw/rectSDF.glsl"
#include "../../shaders/fb_lib/draw/fill.glsl"
#include "../../shaders/fb_lib/space/rotate.glsl"
#include "../../shaders/fb_lib/space/scale.glsl"
#include "../../shaders/fb_lib/math/const.glsl"
#include "../../shaders/fb_lib/generative/random.glsl"
#include "../../shaders/fb_lib/color/contrast.glsl"
#include "../../shaders/fb_lib/color/space/hsv2rgb.glsl"
#include "../../shaders/fb_lib/color/space/rgb2hsv.glsl"

#include "../../shaders/couleurs_lib/lut.glsl"

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;
uniform sampler2D u_lookup;

// Parameters
uniform float u_feedbackAmount;
uniform float u_feedbackScale;
uniform float u_randomAmount;
uniform float u_contrast;
uniform float u_lutMix;

void main() {
  vec2 uv = vTexCoord0;

  #ifdef BUFFER_0

    vec3 color = vec3(0.);
    vec2 st = rotate(uv, mod(u_time / 2., TWO_PI));
    float sdf = smoothstep(.0, .22, length(uv - .5));//rectSDF(st, vec2(.4));
    color = vec3(fill(sdf, .5));

    vec2 fback_uv = scale(uv, vec2(u_feedbackScale));
    // fback_uv = rotate(fback_uv, mod(u_time / 5., TWO_PI));
    fback_uv += u_randomAmount * (random(uv) * 2. - 1.);
    vec3 fback = texture(u_buffer1, fback_uv).rgb;

    // HUE SHIFTING? https://www.shadertoy.com/view/ldsczf
    // fback.b = .0;
    // vec3 fb_hsv = rgb2hsv(fback);    
    // fb_hsv.r += .2;
    // fback = hsv2rgb(fb_hsv);

    color = mix(color, fback, u_feedbackAmount);
    // color = clamp(color * .5 + fback * u_feedbackAmount, 0., 1.);

    oColor = vec4(color, 1.);    

  #elif defined( BUFFER_1 )

    oColor = texture(u_buffer0, uv);

  #else

    vec3 color = texture(u_buffer1, uv).rgb;
    color = contrast(color, 1. + u_contrast);
    color = mix(color, lut(color, u_lookup), u_lutMix);
    oColor = vec4(color, 1.);

  #endif
  
}
