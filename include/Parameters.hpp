#pragma once

#include "cinder/Json.h"

typedef struct {
  float min, max, value;
  std::string name;
} Param;

class Parameters {
public:
  Parameters( const ci::fs::path &path );
  ~Parameters();
  void save();
  void reload();
  
  std::vector<Param *>& get() { return mParameters; }
    
private:
  std::vector<Param *> mParameters;
  ci::JsonTree             mJson;
  ci::fs::path             mPath;
  
  void init();
};
