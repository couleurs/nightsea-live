#pragma once

#include "cinder/Timer.h"
#include <map>
#include <string>

class Animation {
    public:
        Animation();        
        ~Animation();
        void trigger();
        float tick(); 
        bool isActive();

        int mMidiMapping;
        float mTargetValue, mDuration;
        std::string mCurve;

    private:        
        bool hasCompleted();

        ci::Timer mTimer;                            

        static std::map<std::string, std::function<float ( float )>> easingFunctionsMap;
};