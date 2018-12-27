#pragma once

#include "cinder/Timer.h"

class Animation {
    public:
        Animation( float targetValue, float duration, int midiMapping = -1 );
        ~Animation();
        void trigger();
        float tick(); 

        int mMidiMapping;
        float mTargetValue;

    private:
        bool hasCompleted();

        ci::Timer mTimer;
        float mDuration;
};