#include "../../shaders/fb_lib/color/space/hsv2rgb.glsl"
#include "../../shaders/fb_lib/color/space/rgb2hsv.glsl"
#include "../../shaders/fb_lib/color/desaturate.glsl"
#include "../../shaders/fb_lib/color/contrast.glsl"
#include "../../shaders/fb_lib/space/scale.glsl"
#include "../../shaders/fb_lib/space/rotate.glsl"
#include "../../shaders/fb_lib/space/cartesian2polar.glsl"
#include "../../shaders/fb_lib/space/polar2cartesian.glsl"
#include "../../shaders/fb_lib/math/const.glsl"
#include "../../shaders/fb_lib/math/mirror.glsl"
#include "../../shaders/fb_lib/animation/easing/sine.glsl"
#include "../../shaders/fb_lib/generative/random.glsl"

#include "../../shaders/couleurs_lib/lut.glsl"

uniform vec2 u_resolution;
uniform float u_time;

in vec2  vTexCoord0;
out vec4 oColor;

uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;

uniform sampler2D u_input;
uniform sampler2D u_lookup;

// Parameters
uniform float u_circleSize;
uniform float u_feedbackAmount;
uniform float u_noiseAmount;
uniform float u_randomAmount;
uniform float u_hueShift;
uniform float u_saturation;
uniform float u_lutMix;
uniform float u_contrast;

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
  vec2 st = scale(uv, u_circleSize);
  color = vec3(pow(length(st - .5), .11));
  color = smoothstep(0., 1., color);  
  color = 1. - color;
  // color = texture(u_input, uv).rgb;

  vec2 polarUv = (uv * 2.0 - 1.0);
  float angle = cartesian2polar(uv).y;
  // angle = abs(angle);
  // angle = 1. - mirror(angle);
  // angle = sineInOut(angle);  

  float ll = length(polarUv) * .5;
  float n = fractalNoise(vec2(sin(angle * 4. + u_time * 1.) + length(uv) * 10., length(uv) * 20. + sin(angle * 4.))) * u_noiseAmount; 
  ll -= n;

  // vec2 uv_n = polar2cartesian(ll, angle);
  float c1 = smoothstep(uv.y - .1, uv.y, uv.x);
  float c2 = smoothstep(uv.y, uv.y + .1, uv.x);
  float r = 1. - (c1 - c2);  
  r = 1.; 
  
  vec2 uv_n = vec2(cos(angle), sin(angle)) * ll + .5;
  vec3 c_fb = texture(u_buffer1, uv_n + (random(uv) - .5) * r * u_randomAmount).rgb;
  color.b = 0.;
  c_fb = hue(c_fb, u_hueShift);
  
  color = clamp(color + c_fb * u_feedbackAmount, vec3(0.), vec3(1.));  
  oColor = vec4(color, 1.);

#elif defined( BUFFER_1 )

  oColor = texture(u_buffer0, uv);

#else

  vec4 color = texture(u_buffer1, rotate(uv, 0. * -PI/4.));
  color = desaturate(color, -u_saturation);  
  vec4 lut_color = lut(color, u_lookup);
  color = mix(color, lut_color, u_lutMix);
  color = contrast(color, u_contrast);
  oColor = color;  

#endif

}
