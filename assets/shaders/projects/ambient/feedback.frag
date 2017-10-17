#version 330

#include "../../headers/feedback_header.glsl"
#include "../../fb_lib/space/scale.glsl"
#include "../../fb_lib/space/cartesian2polar.glsl"
#include "../../fb_lib/space/polar2cartesian.glsl"
#include "../../fb_lib/math/const.glsl"
#include "../../fb_lib/math/map.glsl"
#include "../../fb_lib/math/mirror.glsl"

float hash( float n ) {
  return fract(sin(n)*43758.5453123);
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

// #define DEBUG_NOISE_FBACK

void main() {
  vec4 source = texture( u_texSource, vTexCoord0 );
  vec4 feedback = texture( u_texFeedback, scale( vTexCoord0, u_feedbackScale ) );
  oColor = mix( source, feedback, u_feedbackAmount );

  #ifdef DEBUG_NOISE_FBACK
    float l = length(vTexCoord0);
    vec2 polar_uv = cartesian2polar( vTexCoord0 );
    // vec2 polar_uv = vTexCoord0 * 2. - 1.;
    float angle = atan(polar_uv.y, polar_uv.x);
    angle = map(angle, -HALF_PI, HALF_PI, 0., 2.);
    // angle = pow(angle, 1.);
    angle = mirror(angle);
    // angle = min(.9, pow(angle, .75));
    float ll = polar_uv.x;
    ll *= 1.1;
    ll -= fractalNoise( vec2( sin( angle * 2. + u_time * 2. ) + l * 20.,
                              l * 10. + sin( angle * 2. ) ) ) * .1;
    vec2 new_uv = polar2cartesian( ll, angle );
    feedback = texture( u_texFeedback, new_uv );
    oColor = source + feedback * .86;
    // oColor = mix( source, feedback, .8 );
    // oColor = vec4(vec3(angle), 1.);
    // oColor = vec4(vec3(ll), 1.);
  #endif
}
