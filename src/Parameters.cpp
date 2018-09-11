#include "Parameters.hpp"
#include "cinder/app/App.h"
#include "cinder/Log.h"

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
  updateJsonTree( mJson );
  mJson.write( app::getAssetPath( mPath ) );
}

void Parameters::writeTo( const ci::fs::path &path )
{
  auto newJson = JsonTree( mJson );
  updateJsonTree( newJson );
  newJson.write( path );  
}

void Parameters::updateJsonTree( ci::JsonTree &oldTree )
{
  JsonTree params = oldTree.getChild( "params" );
  for ( size_t i = 0; i < mParameters.size(); i++ ) {
    auto param = mParameters[ i ];
    auto tree = params.getChild( i );
    tree.addChild( JsonTree( "value", param->value ) );
    params.replaceChild( i, tree );
  }
  oldTree.getChild( "params" ) = params;
}

void Parameters::load( const ci::fs::path &path )
{
  try {
    mJson = JsonTree( ci::loadFile( path ) );
    init();
  }
  catch( Exception &exc ) {  
    CI_LOG_EXCEPTION( "Failed to load parameters: " << path, exc );
  }
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
