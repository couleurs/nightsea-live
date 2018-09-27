#include "../../shaders/couleurs_lib/lut.glsl"
#include "../../shaders/couleurs_lib/grain.glsl"
#include "../../shaders/fb_lib/color/contrast.glsl"
#include "../../shaders/fb_lib/draw/rectSDF.glsl"
#include "../../shaders/fb_lib/draw/fill.glsl"

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

#define INPUT u_inputD

// Parameters
uniform float u_speed;
uniform float u_strength;

// Colorsx

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

void main() {
  vec2 uv = vTexCoord0;

  // CODE HERE :)

// #ifdef BUFFER_0
// #elif defined( BUFFER_1 )
// #else
// #endif
  

  vec3 color = vec3(0.);
  
  vec4 sample_fmn = texture(u_flowMapNoise, uv * 1.);
  vec2 flow_uv = sample_fmn.rg * 2. - 1.;

  vec3 final_uv_A = flowUVW(uv, flow_uv, vec2(.2), u_time * u_speed + sample_fmn.a, false);
  vec3 final_uv_B = flowUVW(uv, flow_uv, vec2(.25), u_time * u_speed + sample_fmn.a, true);

  vec3 texA = texture(INPUT, final_uv_A.xy).rgb * final_uv_A.z;
  vec3 texB = texture(INPUT, final_uv_B.xy).rgb * final_uv_B.z;
  color = texA + texB;  

  vec3 bg = vec3(0.941, 0.953, 0.910);
  float flow = contrast(color, 5.).r;
  flow = smoothstep(.4, .65, flow);
  color = mix(vec3(0.976, .275, 0.357), bg, 1. - flow);

  float g = grain(uv, u_resolution / 2.5, 0., 10.);
  // color += g * mix(.0, .3, flow);

  // float sdf = length(uv - .5);

  // color = vec3(pow(sdf, .5));

  // color = mix(color, lut(color, u_lookup), .2);

  // color = vec3(flow);
  float sdf = 1. - rectSDF(uv, vec2(.5));
  sdf = smoothstep(0., .0, sdf);
  // sdf = fill(sdf, 1.);
  color = mix(bg, color * sdf, sdf);

  oColor = vec4(color, 1.);  
}
