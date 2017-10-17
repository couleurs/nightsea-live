#pragma once

#include "cinder/Json.h"
#include "cinder/Color.h"
#include "cinder/Vector.h"
#include <boost/variant.hpp>

class Config {
private:
    typedef boost::variant<
		int32_t*,
		float*,
		bool*,
		std::string*
    >
    variant_t;

public:
    Config( const ci::fs::path &path );
    ~Config();

    void            save();

	// Binds a config key to a variable pointer.
    template< typename T >
    Config&         operator()( const std::string &key, T *setting )
    {
        mSettingPointers[key] = setting;
        if ( mJson.hasChild( key ) ) {
            auto lvalue = *setting;
            *setting = mJson.getChild( key ).getValue< decltype(lvalue) >();
        }

        // create paths that don't exist, after the values are set
        ensurePath( key );

        return *this;
    }

	ci::JsonTree&		operator[]( const std::string &relativePath );
	const ci::JsonTree&	operator[]( const std::string &relativePath ) const;

	bool				hasKey( const std::string &key ) const { return mJson.hasChild( key ); }
  size_t      getNumChildren() const { return mJson.getNumChildren(); };
  
private:
    ci::JsonTree*                           ensurePath( const std::string &key );

    std::map< std::string, variant_t >      mSettingPointers;
    ci::fs::path                            mPath;
    ci::JsonTree                            mJson;
};

inline ci::Colorf colorfFromJson( const ci::JsonTree& json )
{
	return ci::Colorf( json.getValueAtIndex< float >( 0 ), json.getValueAtIndex< float >( 1 ), json.getValueAtIndex< float >( 2 ) );
}
inline ci::vec3 vec3FromJson( const ci::JsonTree& json )
{
	return ci::vec3( json.getValueAtIndex< float >( 0 ), json.getValueAtIndex< float >( 1 ), json.getValueAtIndex< float >( 2 ) );
}
