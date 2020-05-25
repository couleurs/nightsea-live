#pragma once

#include "cinder/Json.h"
#include "cinder/Color.h"
#include "Animation.h"
#include "Parameter.h"
#include <memory>

typedef struct {
  std::string name;
  ci::Colorf value;
} ColorParameter;

class Parameters {
public:
  Parameters( const ci::fs::path &path );
  ~Parameters();
  void save();
  void reload();
  void writeTo( const ci::fs::path &path );
  void load( const ci::fs::path &path );
  
  std::vector<std::shared_ptr<Parameter>>& get() { return mParameters; }
  std::vector<std::shared_ptr<ColorParameter>>& getColors() { return mColorParameters; }
  std::shared_ptr<Parameter> getParameterForMidiNumber( int number );
  std::vector<std::shared_ptr<Parameter>> getParametersForOSCChannel( int channel );
  std::vector<std::shared_ptr<Animation>> getAnimationsForMidiNumber( int number );
    
private:
  std::vector<std::shared_ptr<Parameter>>      mParameters;
  std::vector<std::shared_ptr<ColorParameter>> mColorParameters;
  ci::JsonTree             mJson;
  ci::fs::path             mPath;
  
  void init();
  void updateJsonTree( ci::JsonTree &oldTree );
};
