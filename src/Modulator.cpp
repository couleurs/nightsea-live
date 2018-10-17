#include "Modulator.h"
#include "cinder/CinderMath.h"

Modulator::Modulator( ModulatorType type, float frequency, float amount ) : mType( type ), mFrequency( frequency ), mAmount( amount ) 
{
    mRand.seed( 0 );
}

Modulator::~Modulator()
{
}

float Modulator::tick( const double t )
{
    switch( mType ) {
        case RANDOM:    return tickRandom( t );
        case SINE:      return tickSine( t );
        case TRIANGLE:  return tickTriangle( t );
        case NOISE:     return tickNoise( t );
    }
}

float Modulator::tickRandom( const double t )
{
    // TODO: use frequency to do a stepped random
    return mAmount * ( mRand.nextFloat() * 2 - 1 );
}

float Modulator::tickSine( const double t )
{
    return mAmount * sin( t * M_2_PI * mFrequency );
}

float Modulator::tickTriangle( const double t )
{
    return mAmount * ( 2 * abs( 2 * ( t * mFrequency - floor( t * mFrequency + .5 ) ) ) - 1 );
}

float Modulator::tickNoise( const double t )
{
    return mAmount * mPerlin.noise( t );
}

ModulatorType Modulator::stringToType( const std::string typeStr )
{
    if ( typeStr == "random" ) return RANDOM;
    else if ( typeStr == "sine" ) return SINE;
    else if ( typeStr == "triangle" ) return TRIANGLE;
    else if ( typeStr == "noise" ) return NOISE;
}