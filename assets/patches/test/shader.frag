#define texture2D(A,B) texture(A,B)

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

uniform sampler2D u_color;
uniform sampler2D u_buffer0;

// Parameters

void main() {
  oColor = vec4(1., 0., 0., 0.);    
}
