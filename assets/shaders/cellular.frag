#version 330

uniform vec2 u_resolution;
uniform float u_time;

in vec2 vTexCoord0;

out vec4 oColor;

vec2 random2( vec2 p ) {
  return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}

float circleSDF( vec2 p ) {
  return length( p - .5 ) * 2.;
}

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  st.x *= u_resolution.x / u_resolution.y;
  vec3 color = vec3(.0);

  // Scale
  st *= 20.;

  // Tile the space
  vec2 i_st = floor(st);
  vec2 f_st = fract(st);

  float m_dist = 1.;  // minimun distance

  for (int y= -1; y <= 1; y++) {
    for (int x= -1; x <= 1; x++) {
      // Neighbor place in the grid
      vec2 neighbor = vec2(float(x),float(y));

      // Random position from current + neighbor place in the grid
      vec2 point = random2(i_st + neighbor);

      // Animate the point
      point = 0.5 + 0.5*sin(u_time + 6.2831*point);

      // Vector between the pixel and the point
      vec2 diff = neighbor + point - f_st;

      // Distance to the point
      float dist = length(diff);

      // Keep the closer distance
      m_dist = m_dist - dist/50.;
    }
  }

  // Draw the min distance (distance field)
  color += m_dist;

  // Draw cell center
//  color += 1.-step(.02, m_dist);

  // Draw grid
//  color.r += step(.98, f_st.x) + step(.98, f_st.y);

  // Show isolines
//  color -= step(.7,abs(sin(27.0*m_dist)))*.5;

  // oColor = vec4(color,1.0);
  oColor = vec4( vec3( step( .2, circleSDF( vec2( vTexCoord0.x + .1 * sin( 5. * u_time ), vTexCoord0.y ) ) ) ), 1. );
}
