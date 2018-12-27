#pragma once

#include "Modulator.h"
#include "Animation.h"
#include <memory>

class Parameter {
    public:
        Parameter();
        ~Parameter();
        void tick( const double t );
        bool hasModulator();
        void createModulator();
        void deleteModulator();

        float min, max, baseValue, currentValue;
        std::string name;
        int midiNumber = -1;
        std::unique_ptr<Modulator> modulator = nullptr;
        std::vector<std::shared_ptr<Animation>> animations;

    private:                
};