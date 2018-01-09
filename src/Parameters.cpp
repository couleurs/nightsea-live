#include "Parameters.hpp"

using namespace ci;

Parameters::Parameters( const fs::path &path ) : mPath( path ), mJson( app::loadAsset( path ) )
{
  init();
}

Parameters::~Parameters()
{
}

void Parameters::init()
{
  JsonTree params = mJson.getChild( "params" );
  mParameters.clear();
  for ( auto it = params.begin(); it != params.end(); it++ ) {
    auto param = new Param();
    param->name = (*it)["name"].getValue();
    param->min = (*it)["min"].getValue<float>();
    param->max = (*it)["max"].getValue<float>();
    param->value = (*it)["value"].getValue<float>();
    try {
      param->midiNumber = (*it)["midi"].getValue<int>();
    }
    catch ( const std::exception &e ) {
      cinder::app::console() << "No midi for param " << param->name << std::endl;
    }
    mParameters.push_back( param );
  }
}

void Parameters::save()
{
  JsonTree params = mJson.getChild( "params" );
  for ( size_t i = 0; i < mParameters.size(); i++ ) {
    auto param = mParameters[ i ];
    auto tree = params.getChild( i );
    tree.addChild( JsonTree( "value", param->value ) );
    params.replaceChild( i, tree );
  }
  mJson.getChild( "params" ) = params;
  mJson.write( app::getAssetPath( mPath ) );
}

void Parameters::reload()
{
  mJson = JsonTree( app::loadAsset( mPath ) );
  init();
}

Param* Parameters::getParamForMidiNumber( int number )
{
  for ( size_t i = 0; i < mParameters.size(); i++ ) {
    auto param = mParameters[ i ];
    if ( param->midiNumber == number ) {
      return param;
    }
  }
  return nullptr;
}
