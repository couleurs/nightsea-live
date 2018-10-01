#include "../../shaders/couleurs_lib/lut.glsl"
#include "../../shaders/couleurs_lib/grain.glsl"
#include "../../shaders/fb_lib/color/contrast.glsl"
#include "../../shaders/fb_lib/draw/rectSDF.glsl"
#include "../../shaders/fb_lib/draw/fill.glsl"
#include "../../shaders/fb_lib/space/scale.glsl"
#include "../../shaders/fb_lib/color/blend/all.glsl"
#include "../../shaders/fb_lib/animation/easing/sine.glsl"
#include "../../shaders/fb_lib/animation/easing/quadratic.glsl"

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

// Textures
uniform sampler2D u_flowMapNoise;
uniform sampler2D u_inputA;
uniform sampler2D u_inputB;
uniform sampler2D u_inputC;
uniform sampler2D u_inputD;
uniform sampler2D u_lookup;

uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;
uniform sampler2D u_buffer2;

#define INPUT u_inputC

// Parameters
uniform float u_speed;
uniform float u_strength;
uniform float u_scaleX;
uniform float u_scaleY;
uniform float u_yOffset;
uniform float u_sineMix;

// Colors
uniform vec3 u_bg;

vec3 flowUVW(vec2 uv, vec2 flow_uv, vec2 jump, float time, bool flowB) {
  float phaseOffset = flowB ? .5 : 0.;
  vec3 flow = vec3(0.);
  float progress = fract(time + phaseOffset);
	flow.xy = uv - flow_uv * progress * u_strength + phaseOffset;
  flow.xy += (time - progress) * jump;
  flow.xy = fract(flow.xy);
  flow.z = 1 - abs(1 - 2 * progress);
  return flow;
}

#define KERNEL_SIZE 2
vec4 sharpen(in sampler2D tex, in vec2 coords, in vec2 renderSize) {
  float dx = 1.0 / renderSize.x;
  float dy = 1.0 / renderSize.y;
  vec4 sum = vec4(0.0);
  for (int i = 0; i < KERNEL_SIZE; i++) {
    float f_size = float(i) + 1.;
    sum += -1. * texture(tex, coords + vec2( -1.0 * dx , 0.0 * dy) * f_size);
    sum += -1. * texture(tex, coords + vec2( 0.0 * dx , -1.0 * dy) * f_size);
    sum += 5. * texture(tex, coords + vec2( 0.0 * dx , 0.0 * dy) * f_size);
    sum += -1. * texture(tex, coords + vec2( 0.0 * dx , 1.0 * dy) * f_size);
    sum += -1. * texture(tex, coords + vec2( 1.0 * dx , 0.0 * dy) * f_size);
  }
  return sum / float(KERNEL_SIZE);
}


void main() {
  vec2 uv = vTexCoord0;

#ifdef BUFFER_0

  vec3 color = vec3(0.);
  
  vec4 sample_fmn = texture(u_flowMapNoise, uv * 1.);
  vec2 flow_uv = sample_fmn.rg * 2. - 1.;

  vec3 final_uv_A = flowUVW(uv, flow_uv, vec2(.2), u_time * u_speed + sample_fmn.a, false);
  vec3 final_uv_B = flowUVW(uv, flow_uv, vec2(.25), u_time * u_speed + sample_fmn.a, true);

  vec3 texA = texture(INPUT, final_uv_A.xy).rgb * final_uv_A.z;
  vec3 texB = texture(INPUT, final_uv_B.xy).rgb * final_uv_B.z;
  color = texA + texB;  
  color = texture(INPUT, scale(uv, vec2(mix(1. + u_scaleX, 1., smoothstep(.2, .6, uv.y)), mix(u_scaleY, 1., step(.5, uv.y)))) + vec2(0., -u_yOffset)).rgb;

  vec3 bg = u_bg;
  float flow_2 = contrast(color, 2.5).r;
  flow_2 = clamp(flow_2, 0., 1.);
  // flow2 = smoothstep(.4, 1., flow2);

  float num_layers = 35.;
  float fract_flow = mix(.9, 1., fract(flow_2 * num_layers));
  float flow2 = floor(flow_2 * num_layers) / num_layers;
  flow2 = mix(flow2, sineIn(flow2), u_sineMix);
  flow2 = mix(0., .75, flow2);
  // bg = blendScreen(bg, vec3(flow2));
  // flow2 = mix(0., 1., flow2);
  float flow = contrast(color, 2.).r;
  // flow = clamp(flow, 0., 1.);  
  flow = smoothstep(.34, .7, flow);
  color = mix(vec3(0.976, .275, 0.357), bg, flow2);

  float g = grain(uv, u_resolution / 2.5, 0., 10.);
  color += g * mix(-.0, .1, 1. - flow);

  // float sdf = length(uv - .5);

  // color = vec3(pow(sdf, .5));

  // color = mix(color, lut(color, u_lookup), .2);

  // color = vec3(flow);
  float sdf = 1. - length(uv - .5);
  sdf = smoothstep(.0, 1., sdf);
  // sdf = fill(sdf, 1.);
  // color = mix(bg, color * sdf, sdf);

  oColor = vec4(vec3(color), 1.);  

#elif defined( BUFFER_1 )

  vec4 c = texture(u_buffer0, uv);
  vec4 sharp = sharpen(u_buffer0, uv, u_resolution);
  oColor = mix(c, sharp, 1.);

  // oColor = vec4(1.);

#elif defined( BUFFER_2 )

  oColor = texture(u_buffer1, uv);

#else

  oColor = texture(u_buffer2, uv);

#endif
}
