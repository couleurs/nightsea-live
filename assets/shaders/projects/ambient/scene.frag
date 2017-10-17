#version 330

#include "../../headers/common_header.glsl"
#include "../../fb_lib/draw/circleSDF.glsl"
#include "../../fb_lib/space/scale.glsl"

void main() {
  float vignette = circleSDF( scale( vTexCoord0, 1. ) );
  oColor = vec4( vec3( vignette * 1.2 ), 1. );
}
