#define CI_MIN_LOG_LEVEL 0

#include "cinder/app/App.h"
#include "cinder/app/RendererGl.h"
#include "cinder/gl/gl.h"
#include "cinder/Log.h"

// Blocks
#include "OscListener.h"
#include "CinderImGui.h"

using namespace ci;
using namespace ci::app;
using namespace std;

class FadingWavesApp : public App {
public:
  FadingWavesApp();
	void setup() override;
	void mouseDown( MouseEvent event ) override;
	void update() override;
	void draw() override;
  
private:
  void updateOSC();
  void updateUI();
  
  osc::Listener           mOSCIn;
  
  gl::FboRef              mFboPingPong;
  gl::Texture2dRef        mTextureFboPingPong[ 2 ];
};

FadingWavesApp::FadingWavesApp()
{
  ////////////////////////////////////////////////////////////////////////////
  // OSC
  mOSCIn.setup( 3000 );
}

void FadingWavesApp::setup()
{
  auto w = getWindowWidth();
  auto h = getWindowHeight();
  gl::Fbo::Format fboFormat;
  fboFormat.disableDepth();
  for ( size_t i = 0; i < 2; ++i ) {
    mTextureFboPingPong[ i ] = gl::Texture2d::create( w, h );
  }
  mFboPingPong = gl::Fbo::create( w, h );
  
  // UI
  ui::initialize();
}

void FadingWavesApp::mouseDown( MouseEvent event )
{
}

void FadingWavesApp::update()
{
  updateOSC();
  updateUI();
}

void FadingWavesApp::updateOSC()
{
  while ( mOSCIn.hasWaitingMessages() ) {
    osc::Message message;
    mOSCIn.getNextMessage( &message );
    auto address = message.getAddress();
    CI_LOG_D( "address from Live: " << address );
//      string deviceId = message.getArgAsString( 0 );
//      float x = message.getArgAsFloat( 1 );
//      float y = message.getArgAsFloat( 2 );
//      float z = message.getArgAsFloat( 3 );
//      float w = message.getArgAsFloat( 4 );
  }
}

void FadingWavesApp::updateUI()
{
  ui::Text( "FPS: %d", (int)getAverageFps() );
}

void FadingWavesApp::draw()
{
	gl::clear( Color( 0, 0, 0 ) );
  
  // Basic Drawing
  
  // Visual Feedback Loop
    // Mix
  
  // Edge Detection
    // Mix
  
  // Vignette
    // Radius
    // Sharpness
    // Mix
  
  // Distorsion
    // Dist1 Intensity
    // Dist2 Intensity
    // Dist3 Intensity
    // Mix
  
  // Blur
    // Radius
  
  // Color Post-Processing (Agnes Martin)
    // Palette
    // Mix
  
  // Visual Feedback Loop
    // Mix
}

CINDER_APP( FadingWavesApp, RendererGl )
