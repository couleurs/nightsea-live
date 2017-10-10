#include "snoise.glsl"
#include "pnoise.glsl"

/*
Function: grain
Author to blame: https://github.com/mattdesl/glsl-film-grain
Description: Natural looking film grain using 3D noise functions
Use:
Options: -
Dependencies: -
*/

#ifndef FNC_GRAIN
#define FNC_GRAIN
float grain(vec2 texCoord, vec2 resolution, float frame, float multiplier) {
    vec2 mult = texCoord * resolution;
    float offset = snoise(vec3(mult / multiplier, frame));
    float n1 = pnoise(vec3(mult, offset), vec3(1.0/texCoord * resolution, 1.0));
    return n1 / 2.0 + 0.5;
}

float grain(vec2 texCoord, vec2 resolution, float frame) {
    return grain(texCoord, resolution, frame, 2.5);
}

float grain(vec2 texCoord, vec2 resolution) {
    return grain(texCoord, resolution, 0.0);
}
#endif
