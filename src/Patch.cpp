#include "Patch.h"
#include "Constants.h"

using namespace std;

Patch::Patch( string name ) : mName( name ), mParams( string( PATCHES_FOLDER ) + string( PATCH_NAME ) + string( PARAMS_FILE ) )
{
}

Patch::~Patch()
{
}

Parameters& Patch::params()
{
    return mParams;
}