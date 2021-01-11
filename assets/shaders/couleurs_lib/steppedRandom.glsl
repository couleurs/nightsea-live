#include "../glslLib/generative/random.glsl"

/*
Function: steppedRandom
Author to blame: Johan
Description: New random value every step
Use:
Options: -
Dependencies: -
*/

#ifndef FNC_STEPPED_RANDOM
#define FNC_STEPPED_RANDOM

float steppedRandom(float t, float stepLength) {
    float t_step = floor(t / stepLength);
    return random(t_step);
}

#endif
