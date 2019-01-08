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