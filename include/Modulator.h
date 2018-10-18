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
        Modulator( ModulatorType type = SINE, float frequency = 1.f, float amount = 0.f );
        ~Modulator();

        float tick( const double t );

        static ModulatorType stringToType( const std::string typeStr );
        
        float  mFrequency, mAmount;
        ModulatorType mType;

    private:
        float tickRandom( const double t );
        float tickSine( const double t );
        float tickTriangle( const double t );
        float tickNoise( const double t );        

        float mRandomValue;      
        ci::Perlin    mPerlin;
        ci::Rand      mRand;
};