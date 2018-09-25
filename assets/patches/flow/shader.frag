uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

// Textures
uniform sampler2D u_flowMapNoise;
uniform sampler2D u_input;

// Parameters

// Colors

vec3 flowUVW(vec2 uv, vec2 flow_uv, float time) {
  vec3 flow = vec3(0.);
  float progress = fract(time);
	flow.xy = uv - flow_uv * progress;
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
  
  vec4 sample_fmn = texture(u_flowMapNoise, uv);
  vec2 flow_uv = sample_fmn.rg * 2. - 1.;
  vec3 final_uv = flowUVW(uv, flow_uv, u_time / 2. + sample_fmn.a);

  color = texture(u_input, final_uv.xy).rgb * final_uv.z;

  oColor = vec4(color, 1.);
}
