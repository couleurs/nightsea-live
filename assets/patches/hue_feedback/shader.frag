#include "../../shaders/fb_lib/color/space/hsv2rgb.glsl"
#include "../../shaders/fb_lib/color/space/rgb2hsv.glsl"
#include "../../shaders/fb_lib/space/scale.glsl"
#include "../../shaders/fb_lib/space/cartesian2polar.glsl"
#include "../../shaders/fb_lib/space/polar2cartesian.glsl"
#include "../../shaders/fb_lib/math/const.glsl"
#include "../../shaders/fb_lib/math/mirror.glsl"
#include "../../shaders/fb_lib/animation/easing/sine.glsl"
#include "../../shaders/fb_lib/generative/random.glsl"

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

vec3 hue(vec3 color, float shift) {
  const vec3  kRGBToYPrime = vec3 (0.299, 0.587, 0.114);
  const vec3  kRGBToI     = vec3 (0.596, -0.275, -0.321);
  const vec3  kRGBToQ     = vec3 (0.212, -0.523, 0.311);

  const vec3  kYIQToR   = vec3 (1.0, 0.956, 0.621);
  const vec3  kYIQToG   = vec3 (1.0, -0.272, -0.647);
  const vec3  kYIQToB   = vec3 (1.0, -1.107, 1.704);

  // Convert to YIQ
  float   YPrime  = dot (color, kRGBToYPrime);
  float   I      = dot (color, kRGBToI);
  float   Q      = dot (color, kRGBToQ);

  // Calculate the hue and chroma
  float   hue     = atan (Q, I);
  float   chroma  = sqrt (I * I + Q * Q);

  // Make the user's adjustments
  hue += shift;

  // Convert back to YIQ
  Q = chroma * sin (hue);
  I = chroma * cos (hue);

  // Convert back to RGB
  vec3    yIQ   = vec3 (YPrime, I, Q);
  color.r = dot (yIQ, kYIQToR);
  color.g = dot (yIQ, kYIQToG);
  color.b = dot (yIQ, kYIQToB);

  return color;
}

void main() {
  vec2 uv = vTexCoord0;

#ifdef BUFFER_0
  
  vec3 color = vec3(0.);
  vec2 st = scale(uv, 2.5);
  color = vec3(length(st - .5));
  color = smoothstep(.2, .2, color);  
  color = 1. - color;

  vec2 polarUv = (uv * 2.0 - 1.0);
  float angle = cartesian2polar(uv).y;
  // angle = abs(angle);
  // angle = 1. - mirror(angle);
  // angle = sineInOut(angle);  

  float ll = length(polarUv) * .5;
  float n = fractalNoise(vec2(sin(angle * 4. + u_time * 2.) + length(uv) * 10., length(uv) * 20. + sin(angle * 4.))) * .01; 
  ll -= n;

  // vec2 uv_n = polar2cartesian(ll, angle);
  vec2 uv_n = vec2(cos(angle), sin(angle)) * ll + .5;
  vec3 c_fb = texture(u_buffer1, uv_n + (random(vec2(uv.x + 1., 0.)) - .5) * .05).rgb;
  color.b = 0.;
  c_fb = hue(c_fb, .3);
  
  color = clamp(color + c_fb * .95, vec3(0.), vec3(1.));  
  oColor = vec4(color, 1.);

#elif defined( BUFFER_1 )

  oColor = texture(u_buffer0, uv);

#else

  oColor = texture(u_buffer1, uv);

#endif

}
