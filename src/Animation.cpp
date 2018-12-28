#include "Animation.h"
#include "cinder/Log.h"
#include "cinder/Easing.h"

using namespace std;

map<string, function<float ( float )>> Animation::easingFunctionsMap = {
    {"linear", [] ( float t ) { return t; } },
    {"sine",   [] ( float t ) { return ci::easeOutSine( t ); } },
    {"quad",   [] ( float t ) { return ci::easeOutQuad( t ); } },
    {"cubic",  [] ( float t ) { return ci::easeOutCubic( t ); } }
};

Animation::Animation()
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
            float t = mTimer.getSeconds() / mDuration;
            t = easingFunctionsMap[ mCurve ]( t );
            return t;
        }
    }
}

bool Animation::hasCompleted()
{
    return mTimer.getSeconds() >= mDuration;
}



