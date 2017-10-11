#version 330

#include "../../headers/feedback_header.glsl"
#include "../../fb_lib/space/scale.glsl"
#include "../../fb_lib/space/cartesian2polar.glsl"
#include "../../fb_lib/space/polar2cartesian.glsl"
#include "../../fb_lib/math/const.glsl"
#include "../../fb_lib/math/map.glsl"

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

void main() {
  vec4 source = texture( u_texSource, vTexCoord0 );

  float l = length( vTexCoord0 );
  // vec2 polar_uv = cartesian2polar( vTexCoord0 );
  vec2 polar_uv = vTexCoord0 - .5;
  float angle = atan(polar_uv.y, polar_uv.x);
  float ll = polar_uv.x * .5;
  ll -= fractalNoise( vec2( sin( angle * 4. + u_time * 2. ) + l * 10.,
                            l * 20. + sin( angle * 4. ) ) ) * .05;
  vec2 new_uv = polar2cartesian( ll, angle );

  vec4 feedback = texture( u_texFeedback, scale( vTexCoord0, u_feedbackScale ) );
  oColor = mix( source, feedback, u_feedbackAmount );
  // oColor = source + feedback * .2;
  // oColor = mix( source, feedback, .8 );

  // oColor = vec4(vec3(map(angle, -HALF_PI, HALF_PI, 0., 1.)), 1.);
  // oColor = vec4(vec3(vTexCoord0, 0.), 1.);
}
