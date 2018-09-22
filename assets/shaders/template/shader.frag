uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

// Textures

// Parameters

// Colors

void main() {
  vec2 uv = vTexCoord0;

  // CODE HERE :)

// #ifdef BUFFER_0
// #elif defined( BUFFER_1 )
// #else
// #endif
  
  vec3 color = vec3(0.);

  oColor = vec4(color, 1.);
}
