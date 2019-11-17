#include "Parameter.h"
#include "cinder/CinderMath.h"

Parameter::Parameter()
{
}

Parameter::~Parameter()
{
}

void Parameter::tick( const double t ) 
{   
    if ( modulator != nullptr ) {
      currentValue = baseValue + modulator->tick( t );
    }

    for ( size_t i = 0; i < animations.size(); i++ ) {
      auto anim = animations[ i ];      
      if ( anim->isActive() ) {
        currentValue = ci::lerp( baseValue, anim->mTargetValue, anim->tick() );
      }
    }
  }

  bool Parameter::hasModulator() {
    return ( modulator != nullptr );
  }

  void Parameter::createModulator() {
    if ( !hasModulator() ) {
       modulator = std::make_unique<Modulator>();
    }
  }  

  void Parameter::deleteModulator() {
    modulator = nullptr;
    currentValue = baseValue;
  }

