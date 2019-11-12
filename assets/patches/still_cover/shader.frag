#define texture2D(A,B) texture(A,B)

#include "../../shaders/glslLib/math/mix.glsl"

in vec2  vTexCoord0;
out vec4 oColor;

uniform vec2 u_resolution;

uniform sampler2D u_gradient_1;
uniform sampler2D u_gradient_2;
uniform sampler2D u_gradient_grayscale;
uniform sampler2D u_cloud_1_grayscale;

uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;
uniform sampler2D u_buffer2;

uniform float u_angle;
uniform float u_whiteMix;
uniform float u_noiseAmount;

uniform float u_time;

const mat2 m = mat2( 1.6,  1.2, -1.2,  1.6 );

vec2 hash( vec2 p ) {
	p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float noise( in vec2 p ) {
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;
	vec2 i = floor(p + (p.x+p.y)*K1);	
    vec2 a = p - i + (i.x+i.y)*K2;
    vec2 o = (a.x>a.y) ? vec2(1.0,0.0) : vec2(0.0,1.0); //vec2 of = 0.5 + 0.5*vec2(sign(a.x-a.y), sign(a.y-a.x));
    vec2 b = a - o + K2;
	vec2 c = a - 1.0 + 2.0*K2;
    vec3 h = max(0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );
	vec3 n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));
    return dot(n, vec3(70.0));	
}

float fbm(vec2 n) {
	float total = 0.0, amplitude = .1;
	for (int i = 0; i < 7; i++) {
		total += noise(n) * amplitude;
		n = m * n;
		amplitude *= 0.4;
	}
	return total;
}

vec4 mainPass() {
  vec2 uv = vTexCoord0;
  vec3 color = vec3(0., 0., 0.);  
  float q = fbm(uv) * 1.;
  float t = u_time + 10000.;

	float r = 0.;
	uv *= 1.1;
  uv -= q - t * .1;
  float weight = .8;
  for (int i = 0; i < 7; i++){
    r += weight * abs(noise(uv));
    uv *= 100.;
    uv += t * .2;
    weight *= 0.6;
  }

  //noise shape
	float f = 0.0;
  uv = vTexCoord0;
	uv *= 1.1;
  uv += q - t * .1;
  weight = .7;
  for (int i = 0; i < 3; i++){
    f += weight * noise(uv);
    uv = m * uv + t * .5;
    weight *= .5;
  }
  f *= .0;
  r += f;

  r = smoothstep(.0, .8, r);
  float debug = r;
  // return vec4(debug, debug, debug, 1.);

  // vec4 c1 = mix(vec4(0.063, 0.655, 0.902, 1.), vec4(1.), .3);
  // vec4 c2 = vec4(0.592, 0.855, 0.996, 1.);
  // vec4 c3 = vec4(0.933, 0.843, 0.965, 1.);
  // vec4 c4 = vec4(0.812, 0.847, 0.953, 1.);

  // vec4 c1 = vec4(0.604, 0.737, 0.788, 1.);
  // vec4 c2 = vec4(0.325, 0.482, 0.588, 1.);
  // vec4 c3 = vec4(0.212, 0.333, 0.447, 1.);
  // vec4 c4 = vec4(0.086, 757, 0.227, 1.);

  // vec4 c1 = vec4(0.925, 0.427, 0.220, 1.);
  // vec4 c2 = vec4(0.698, 0.467, 0.498, 1.);
  // vec4 c3 = vec4(0.063, 0.655, 0.902, 1.);
  // vec4 c4 = vec4(0.592, 0.855, 0.996, 1.);

  vec4 c1 = vec4(0.035, 0.584, 0.847, 1.);
  vec4 c2 = vec4(0.984, 0.627, 0.898, 1.);

  
  return mix(c1, mix(c2, vec4(1.), .5), 1. - r);

  // oColor = mix(c1, c3, vTexCoord0.y) * (r +.5);

  // oColor = mix(c1, c2, c3, c4, clamp(r, 0., 1.));
}

void main() {
  // #ifdef BUFFER_0
    oColor = mainPass();    
// #elif defined( BUFFER_1 )
//     vec4 source = texture(u_buffer0, vTexCoord0);
//     vec4 feedback = texture(u_buffer2, vTexCoord0 * .99);
//     oColor = mix(source, feedback, .9);  
// #elif defined( BUFFER_2 )
//     oColor = texture(u_buffer1, vTexCoord0);
// #else
//     oColor = texture(u_buffer0, vTexCoord0);
// #endif
  
}
