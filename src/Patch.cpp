#include "Patch.h"

using namespace std;

const string patchFolder = "patches/";
const string fragFilename = "/shader.frag";
const string paramFilename = "/params.json";  

Patch::Patch( string name ) : mName( name ), 
                              mParams( patchFolder + name + paramFilename ), 
                              mFolderPath( patchFolder + name ),
                              mShaderPath( patchFolder + name + fragFilename )

{
}

Patch::~Patch()
{
}

Parameters& Patch::params()
{
    return mParams;
}