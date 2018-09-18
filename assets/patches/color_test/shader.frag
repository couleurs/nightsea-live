uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

uniform sampler2D u_color;

// Parameters

void main() {
// #ifdef BUFFER_0
// #elif defined( BUFFER_1 )
// #else
// #endif
  
  vec2 uv = vTexCoord0;
  vec3 color = vec3(0.);

  color = vec3(1., 0., 0.);
  // color = texture(u_color, uv).rgb;
  // color = vec3(0.918, 0.196, 0.137);

  oColor = vec4(color, 1.);
}
