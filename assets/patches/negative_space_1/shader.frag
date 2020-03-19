#define texture2D(A,B) texture(A,B)

#include "../../shaders/glslLib/color/contrast.glsl"
#include "../../shaders/glslLib/color/desaturate.glsl"

#include "../../shaders/glslLib/space/ratio.glsl"

#include "../../shaders/glslLib/draw/rectSDF.glsl"

#define GAUSSIANBLUR1D_TYPE vec3
#define GAUSSIANBLUR1D_SAMPLER_FNC(POS_UV) texture(tex, POS_UV).rgb
#include "../../shaders/glslLib/filter/gaussianBlur/1D.glsl"

#include "../../shaders/couleurs_lib/grain.glsl"
#include "../../shaders/fb_lib/generative/snoise.glsl"

uniform float u_time;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_whiteMix;
uniform float u_frameNumber;

uniform vec2 u_resolution;
uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;

in vec2  vTexCoord0;
out vec4 oColor;

// Textures
uniform sampler2D u_ns_1_text;
uniform sampler2D u_ns_2_text;

// Parameters
uniform float u_blurRadius;
uniform float u_xOffset;
uniform float u_xScale;
uniform float u_yScale;
uniform float u_grainAmount;
uniform float u_noiseScale;
uniform float u_noiseSeed;
uniform float u_noiseAmount;

// Colors

//

float ns1_noise(vec2 uv, float t) {
  return snoise(uv * u_noiseScale * 10. + u_noiseSeed * 100. + t);
}

void main() {
  vec2 uv = vTexCoord0;
  vec3 color = vec3(0.);
  vec2 st = ratio(uv, u_resolution) - .5;
  st += vec2(u_xOffset, 0.);
  vec2 st_2 = st - vec2(2. * u_xOffset, 0.);
  st *= vec2(u_xScale, u_yScale);
  st_2 *= vec2(u_xScale, u_yScale);
  float blur_mask = mix(smoothstep(-.15, .5, st.x), smoothstep(-.15, .5, -st_2.x), step(.5, uv.x));
  float br = u_blurRadius * 2. * blur_mask;
  float t = u_frameNumber * .003;
  float gif_length = 1.8;
  float time = mod(t, gif_length);

#ifdef BUFFER_0

  // Code here :)
  vec3 bg = vec3(0.996, 0.878, 0.769);
  vec3 fg1 = vec3(0.910, 0.271, 0.075);
  vec3 fg2 = vec3(0.698, 0.161, 0.051);
  color = bg;
  
  #ifdef LOOP
    float noise = mix(ns1_noise(st, time), ns1_noise(st, time - gif_length), time / gif_length);
  #else 
    float noise = snoise(st * u_noiseScale * 10. + u_noiseSeed * 100. + t * 0.);
  #endif    
  
  float sdf = length(st + noise * u_noiseAmount);
  sdf = smoothstep(.2, .21, sdf);
  float sdf_2 = length(st_2 + noise * u_noiseAmount);
  sdf_2 = smoothstep(.2, .21, sdf_2);
  color = vec3(sdf * sdf_2);
  // color = vec3(1., 0., 0.);

#elif defined( BUFFER_1 )

  color = gaussianBlur1D(u_buffer0, uv, vec2(br / u_resolution.x, 0.), 20);      

#else
  
  color = gaussianBlur1D(u_buffer1, uv, vec2(0., br / u_resolution.y), 20);        

  float shape_mask = color.r;
  vec3 c_1 = vec3(0.937, 0.277, 0.246);
  vec3 c_2 = vec3(0.710, 0.663, 0.965);
  vec3 c_3 = vec3(0.996, 0.878, 0.769);

  #ifdef LOOP
    float rect_n = mix(snoise(uv + u_noiseSeed * 120. + time), snoise(uv + u_noiseSeed * 120. + time - gif_length), time / gif_length);
  #else 
    float rect_n = snoise(uv + u_noiseSeed * 120.);
  #endif  
  float rect_sdf = rectSDF(uv + .03 * rect_n, vec2(1.2, 1.22));
  rect_sdf = smoothstep(.7, 1., rect_sdf);
  // color = vec3(rect_sdf);

  vec3 c_bg = mix(c_1, c_3, rect_sdf);
  color = mix(c_bg, c_2, 1. - shape_mask);

  // Post-Processing
  // color = texture(u_buffer0, uv).rgb;
  // color = contrast(color, u_contrast * 2.);
  // color = desaturate(color, u_saturation);
  // color = mix(color, vec3(1.), u_whiteMix);  

  float debug = mix(smoothstep(-.15, .5, st.x), smoothstep(-.15, .5, -st_2.x), step(.5, uv.x));
  // color = vec3(debug);

  vec3 grain = vec3(grain(uv, u_resolution / 1.5, 0., 2.5)) * c_3;
  color = color + grain * mix(u_grainAmount, 0., 1. - shape_mask); 

  vec4 text_1 = texture(u_ns_1_text, uv);
  vec4 text_2 = texture(u_ns_2_text, uv);
  color = mix(color, vec3(0.886, 0.863, 1.000), text_1.a * .9);
  color = mix(color, vec3(0.710, 0.663, 0.965), text_2.a * 1.);
  // color = vec3(text_2.a);

#endif  
  
  oColor = vec4(color, 1.);
}
