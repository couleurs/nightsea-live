#include "common_header.glsl"

uniform sampler2D	u_texInput;
uniform sampler2D	u_texLUT;
uniform float     u_lutMix;

#include "../couleurs_lib/lut.glsl"
