#pragma once

#include "cinder/Perlin.h"
#include "cinder/Rand.h"

enum ModulatorType {
    RANDOM,
    SINE,
    TRIANGLE,
    NOISE
};

class Modulator {    
    public:
        Modulator( ModulatorType type, float frequency, float amount );
        ~Modulator();

        float tick( const double t );

        static ModulatorType stringToType( const std::string typeStr );

    private:
        float tickRandom( const double t );
        float tickSine( const double t );
        float tickTriangle( const double t );
        float tickNoise( const double t );        

        ModulatorType mType;
        float         mFrequency, mAmount, mRandomValue;      
        ci::Perlin    mPerlin;
        ci::Rand      mRand;
};