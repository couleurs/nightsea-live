#include "Performance.h"

using namespace std;

Performance::Performance( initializer_list<string> initList ) : mCurrentPatchIndex( 0 )
{
    for ( string s : initList ) {
        Patch patch( s );
        mPatches.push_back( patch );
    }    
}

Performance::~Performance()
{
}

Patch& Performance::currentPatch()
{
    return mPatches[ mCurrentPatchIndex ];
}

void Performance::goToPatch( int index )
{
    if ( index < 0 || index > mPatches.size() - 1 ) {
        return;
    }
    mCurrentPatchIndex = index;    
}

bool Performance::previous()
{
    if ( mCurrentPatchIndex >= 1 ) {
        mCurrentPatchIndex--;
        return true;
    } 
    return false;
}

bool Performance::next()
{
    if ( mCurrentPatchIndex < mPatches.size() - 1 ) {
        mCurrentPatchIndex++;
        return true;
    }
    return false;
}