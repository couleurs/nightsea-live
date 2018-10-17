#pragma once

#include "cinder/Json.h"
#include "cinder/Color.h"
#include "Modulator.h"
#include <memory>

typedef struct {
  float min, max, baseValue, currentValue;
  std::string name;
  int midiNumber = -1;
  std::unique_ptr<Modulator> modulator;

  void tick( const double t ) {    
    if ( modulator != nullptr ) {
      currentValue = baseValue + modulator->tick( t );
    }
  }
} Param;

typedef struct {
  std::string name;
  ci::Colorf value;
} ColorParam;

class Parameters {
public:
  Parameters( const ci::fs::path &path );
  ~Parameters();
  void save();
  void reload();
  void writeTo( const ci::fs::path &path );
  void load( const ci::fs::path &path );
  
  std::vector<Param *>& get() { return mParameters; }
  std::vector<ColorParam *>& getColors() { return mColorParameters; }
  Param* getParamForMidiNumber( int number );
    
private:
  std::vector<Param *>     mParameters;
  std::vector<ColorParam *> mColorParameters;
  ci::JsonTree             mJson;
  ci::fs::path             mPath;
  
  void init();
  void updateJsonTree( ci::JsonTree &oldTree );
};
