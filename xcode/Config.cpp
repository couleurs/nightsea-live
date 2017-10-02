#include "Config.hpp"
#include "cinder/app/App.h"
#include <boost/algorithm/string.hpp>

using namespace std;
using namespace ci;

Config::Config( const ci::fs::path &path ) :
mPath( path ),
mJson( app::loadAsset( path ) )
{
}

Config::~Config()
{
}


struct to_json_visitor : boost::static_visitor<> {
    to_json_visitor( JsonTree &json ) : json( json ) {}

    JsonTree &json;

    template< typename T >
    void operator()( T* const ptr ) const
    {
        json = JsonTree( json.getKey(), *ptr );
    }
};

void Config::save()
{
    for( const auto& setting : mSettingPointers ) {
        const auto& k = setting.first;

        JsonTree j = mJson.getChild( k );
        boost::apply_visitor( to_json_visitor( j ), setting.second );
        mJson.getChild( k ) = j;
    }

    mJson.write( app::getAssetPath( mPath ) );
}

JsonTree* Config::ensurePath( const string &key )
{
    deque< string > paths;
    boost::split( paths, key, boost::is_any_of(".") );

    JsonTree *t = &mJson;
    for ( const auto& p : paths ) {
        t->hasChild( p ) ? t->getChild( p ) : t->addChild( JsonTree::makeObject( p ) );
        t = &t->getChild( p );
    }

    return t;
}

JsonTree& Config::operator[]( const std::string &relativePath )
{
	return mJson[relativePath];
}
const JsonTree&	Config::operator[]( const std::string &relativePath ) const
{
	return mJson[relativePath];
}
