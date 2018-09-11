#pragma once

#include "cinder/Json.h"

typedef struct {
  float min, max, value;
  std::string name;
  int midiNumber = -1;
} Param;

class Parameters {
public:
  Parameters( const ci::fs::path &path );
  ~Parameters();
  void save();
  void reload();
  void writeTo( const ci::fs::path &path );
  void load( const ci::fs::path &path );
  
  std::vector<Param *>& get() { return mParameters; }
  Param* getParamForMidiNumber( int number );
    
private:
  std::vector<Param *> mParameters;
  ci::JsonTree             mJson;
  ci::fs::path             mPath;
  
  void init();
  void updateJsonTree( ci::JsonTree &oldTree );
};
