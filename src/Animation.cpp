#include "Animation.h"
#include "cinder/Log.h"

Animation::Animation( float targetValue, float duration, int midiMapping ) : mTargetValue( targetValue ), mDuration( duration ), mMidiMapping( midiMapping )
{
}

Animation::~Animation()
{
}

void Animation::trigger()
{    
    mTimer.start();
}

float Animation::tick()
{
    if ( mTimer.isStopped() ) {        
        return hasCompleted() ? 1 : 0;
    }
    else {
        if ( hasCompleted() ) {
            mTimer.stop();
            return 1;
        }
        else {
            std::cout << mTimer.getSeconds() / mDuration << " lerp" << std::endl;
            return mTimer.getSeconds() / mDuration;
        }
    }
}

bool Animation::hasCompleted()
{
    return mTimer.getSeconds() >= mDuration;
}



