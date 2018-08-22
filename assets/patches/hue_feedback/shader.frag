#include "../../shaders/fb_lib/color/space/hsv2rgb.glsl"
#include "../../shaders/fb_lib/color/space/rgb2hsv.glsl"
#include "../../shaders/fb_lib/space/scale.glsl"
#include "../../shaders/fb_lib/space/cartesian2polar.glsl"
#include "../../shaders/fb_lib/space/polar2cartesian.glsl"
#include "../../shaders/fb_lib/math/const.glsl"
#include "../../shaders/fb_lib/math/mirror.glsl"
#include "../../shaders/fb_lib/animation/easing/sine.glsl"

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;

float hash( float n ) {
    return fract(sin(n) * 43758.5453123);
}

float noise( in vec2 x ) {
    vec2 p = floor(x);
    vec2 f = fract(x);

    f = f*f*(3.0-2.0*f);

    float n = p.x + p.y*157.0;

    return mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
               mix( hash(n+157.0), hash(n+158.0),f.x),f.y);
}

float fractalNoise(vec2 pos) {
	float n = 0.;
	float scale = 1. / 1.5;
	for (int i = 0; i < 5; i += 1) {
		n += noise(pos) * scale;
		scale *= 0.5;
		pos *= 2.;
	}
	return n;
}

void main() {
  vec2 uv = vTexCoord0;

#ifdef BUFFER_0
  
  vec3 color = vec3(0.);
  color = 1. - vec3(length(uv - .5));
  color = smoothstep(.7, 1., color);  

  vec2 polarUv = (uv * 2.0 - 1.0);
  float angle = cartesian2polar(uv).y;
  angle = abs(angle);
  // angle = 1. - mirror(angle);
  // angle = sineInOut(angle);  

  float ll = length(polarUv) * .5;
  float n = fractalNoise(vec2(sin(angle * 4. + u_time * 2.) + length(uv) * 10., length(uv) * 20. + sin(angle * 4.))) * .05; 
  ll -= n;

  vec2 uv_n = polar2cartesian(ll, angle);
  
  oColor = vec4(uv_n.x, uv_n.y, 0., 1.);  
  // oColor = vec4(vec3(ll), 1.);

#elif defined( BUFFER_1 )

  oColor = texture(u_buffer0, uv);

#else

  oColor = texture(u_buffer1, uv);

#endif

}
