uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

void main() {
// #ifdef BUFFER_0
// #elif defined( BUFFER_1 )
// #else
// #endif
  
  vec2 uv = vTexCoord0;
  vec3 color = vec3(0.);

  // CODE HERE :)

  oColor = vec4(color, 1.);
}
