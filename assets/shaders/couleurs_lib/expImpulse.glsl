/*
Function: steppedRandom
Author to blame: Inigo https://www.iquilezles.org/www/articles/functions/functions.htm
Description: Exponential impulse
Use:
Options: -
Dependencies: -
*/

#ifndef FNC_EXPONENTIAL_IMPULSE
#define FNC_EXPONENTIAL_IMPULSE

float expImpulse(float x, float k) {
  float h = k * x;
  return h * exp(1. - h);
}

#endif
