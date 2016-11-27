#define CI_MIN_LOG_LEVEL 0

#include "cinder/app/App.h"
#include "cinder/app/RendererGl.h"
#include "cinder/gl/gl.h"
#include "cinder/Log.h"

// Blocks
#include "OscListener.h"
#include "CinderImGui.h"
#include "Watchdog.h"

#include <ctime>

using namespace ci;
using namespace ci::app;
using namespace std;

typedef struct {
  fs::path path;
  time_t modified;
} File;

class FadingWavesApp : public App {
public:
  FadingWavesApp();
	void setup() override;
	void mouseDown( MouseEvent event ) override;
	void update() override;
	void draw() override;
  
private:
  void initShaderFiles();
  void loadShaders();
  
  void updateOSC();
  void updateUI();
  void updateShaders();
  
  void clearFBO( gl::FboRef fbo );
  
  osc::Listener           mOSCIn;
  
  gl::FboRef              mSourceFbo;
  
  gl::FboRef              mFeedbackFboPingPong;
  gl::Texture2dRef        mFeedbackTextureFboPingPong[ 2 ];
  size_t                  mFeedbackPing = 0;
  size_t                  mFeedbackPong = 1;
  
  gl::FboRef              mPostProcessingFboPingPong;
  gl::Texture2dRef        mPostProcessingTextureFboPingPong[ 2 ];
  size_t                  mPostProcessingPing = 0;
  size_t                  mPostProcessingPong = 1;
  
  gl::GlslProgRef         mCellularShader;
  
  gl::GlslProgRef         mFeedbackShader;
  
  gl::GlslProgRef         mEdgeDetectionShader;
  float                   mEdgeDetectionMixAmount = .5f;
  float                   mEdgeDetectionThreshold = .05f;
  
  gl::GlslProgRef         mMaskShader;
  float                   mMaskMixAmount = 1.f;
  float                   mMaskSharpness = .05f;
  float                   mMaskRadius    = .5f;
  
  std::vector<File>       mShaderFiles;
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
  
  // Set up the FBOs
  gl::Fbo::Format feedbackFormat, postProcessingFormat;
  feedbackFormat.disableDepth();
  postProcessingFormat.disableDepth();
  for ( size_t i = 0; i < 2; ++i ) {
    mFeedbackTextureFboPingPong[ i ] = gl::Texture2d::create( w, h );
    feedbackFormat.attachment( GL_COLOR_ATTACHMENT0 + (GLenum)i, mFeedbackTextureFboPingPong[ i ] );
    
    mPostProcessingTextureFboPingPong[ i ] = gl::Texture2d::create( w, h );
    postProcessingFormat.attachment( GL_COLOR_ATTACHMENT0 + (GLenum)i, mPostProcessingTextureFboPingPong[ i ] );
  }
  mFeedbackFboPingPong = gl::Fbo::create( w, h, feedbackFormat );
  mPostProcessingFboPingPong = gl::Fbo::create( w, h, postProcessingFormat );
  mSourceFbo = gl::Fbo::create( w, h );
  
  clearFBO( mFeedbackFboPingPong );
  clearFBO( mPostProcessingFboPingPong );
  clearFBO( mSourceFbo );
  
  // Shaders
  initShaderFiles();
  loadShaders();
  
  // UI
  ui::initialize();
}

// Shader paths
static fs::path cellularPath      = "shaders/cellular.frag";
static fs::path feedbackPath      = "shaders/feedback.frag";
static fs::path edgeDetectionPath = "shaders/edge_detection.frag";
static fs::path maskPath          = "shaders/mask.frag";

void FadingWavesApp::initShaderFiles()
{
  time_t now = time( 0 );
  mShaderFiles.push_back( { cellularPath, now } );
  mShaderFiles.push_back( { edgeDetectionPath, now } );
}

void FadingWavesApp::loadShaders()
{
  DataSourceRef vert = app::loadAsset( "shaders/passthrough.vert" );
  
  DataSourceRef cellularFrag = app::loadAsset( cellularPath );
  mCellularShader = gl::GlslProg::create( gl::GlslProg::Format()
                                         .version( 330 )
                                         .vertex( vert )
                                         .fragment( cellularFrag ) );
  
  DataSourceRef feedbackFrag = app::loadAsset( feedbackPath );
  mFeedbackShader = gl::GlslProg::create( gl::GlslProg::Format()
                                         .version( 330 )
                                         .vertex( vert )
                                         .fragment( feedbackFrag ) );
  
  DataSourceRef edgeDetectionFrag = app::loadAsset( edgeDetectionPath );
  mEdgeDetectionShader = gl::GlslProg::create( gl::GlslProg::Format()
                                         .version( 330 )
                                         .vertex( vert )
                                         .fragment( edgeDetectionFrag ) );
  
  DataSourceRef maskFrag = app::loadAsset( maskPath );
  mMaskShader = gl::GlslProg::create( gl::GlslProg::Format()
                                      .version( 330 )
                                      .vertex( vert )
                                      .fragment( maskFrag ) );
}

void FadingWavesApp::mouseDown( MouseEvent event )
{
}

void FadingWavesApp::update()
{
  updateOSC();
  updateUI();
//  updateShaders();
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

void FadingWavesApp::updateShaders()
{
  bool shadersNeedReload = false;
  for (size_t i = 0; i < mShaderFiles.size(); i++) {
    auto file = mShaderFiles[i];
    time_t lastUpdate = fs::last_write_time( file.path );
    if ( difftime( lastUpdate, file.modified ) > 0 ) {
      // Shader has changed: reload shader and update File
      file.modified = lastUpdate;
      mShaderFiles[i] = file;
      shadersNeedReload = true;
    }
  }
  
  if ( shadersNeedReload ) loadShaders();
}

void FadingWavesApp::draw()
{
  gl::clear();
  
  {
//    {
//      // Clear FBOs
//      const gl::ScopedFramebuffer scopedFrameBuffer( mFeedbackFboPingPong );
//      const gl::ScopedViewport scopedViewport( ivec2( 0 ), mFeedbackFboPingPong->getSize() );
//      {
//        const static GLenum buffers[] = {
//          GL_COLOR_ATTACHMENT0,
//          GL_COLOR_ATTACHMENT1
//        };
//        gl::drawBuffers( 2, buffers );
//        gl::clear();
//      }
//    }
    
    Rectf drawRect = Rectf( 0.f, 0.f, getWindowWidth(), getWindowHeight() );
    vec2 resolution = getWindowSize();
    
    {
      // Basic Drawing with File watcher
      gl::ScopedFramebuffer scopedFBO( mSourceFbo );
      gl::ScopedGlslProg shader( mCellularShader );
      mCellularShader->uniform( "u_resolution", resolution );
      mCellularShader->uniform( "u_time", (float)getElapsedSeconds() );
      gl::drawSolidRect( drawRect );
    }
    
    {
      // Visual Feedback Loop
        // Mix
      gl::ScopedFramebuffer scopedFBO( mFeedbackFboPingPong );
      gl::drawBuffer( GL_COLOR_ATTACHMENT0 + (GLenum)mFeedbackPing );
      gl::ScopedGlslProg shader( mFeedbackShader );
      gl::ScopedTextureBind sourceTexture( mSourceFbo->getColorTexture(), 0 );
      gl::ScopedTextureBind feedbackTexture( mFeedbackTextureFboPingPong[ mFeedbackPong ], 1 );
      gl::drawSolidRect( drawRect );
      mFeedbackPing = mFeedbackPong;
      mFeedbackPong = ( mFeedbackPing + 1 ) % 2;
    }
  
    {
      // Edge Detection
        // Mix
      gl::ScopedFramebuffer scopedFBO( mPostProcessingFboPingPong );
      gl::drawBuffer( GL_COLOR_ATTACHMENT0 + (GLenum)mPostProcessingPing );
      gl::ScopedGlslProg shader( mEdgeDetectionShader );
      gl::ScopedTextureBind inputTexture( mFeedbackTextureFboPingPong[ mFeedbackPong ], 0 );
      mEdgeDetectionShader->uniform( "u_resolution", resolution );
      mEdgeDetectionShader->uniform( "u_mix_amount", mEdgeDetectionMixAmount );
      mEdgeDetectionShader->uniform( "u_threshold", mEdgeDetectionThreshold );
      gl::drawSolidRect( drawRect );
      mPostProcessingPing = mPostProcessingPong;
      mPostProcessingPong = ( mPostProcessingPing + 1 ) % 2;
    }
    
    {
      // Mask
        // Radius
        // Sharpness
        // Mix
//      gl::ScopedFramebuffer scopedFBO( mPostProcessingFboPingPong );
//      gl::drawBuffer( GL_COLOR_ATTACHMENT0 + (GLenum)mPostProcessingPing );
      gl::ScopedGlslProg shader( mMaskShader );
      gl::ScopedTextureBind inputTexture( mPostProcessingTextureFboPingPong[ mPostProcessingPong ], 0 );
      mMaskShader->uniform( "u_resolution", resolution );
      mMaskShader->uniform( "u_mix_amount", mMaskMixAmount );
      mMaskShader->uniform( "u_sharpness", mMaskSharpness );
      mMaskShader->uniform( "u_radius", mMaskRadius );
      gl::drawSolidRect( drawRect );
      mPostProcessingPing = mPostProcessingPong;
      mPostProcessingPong = ( mPostProcessingPing + 1 ) % 2;
    }
  
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
}

void FadingWavesApp::clearFBO( gl::FboRef fbo )
{
  gl::ScopedFramebuffer scopedFramebuffer( fbo );
  gl::ScopedViewport scopedViewport( ivec2( 0 ), fbo->getSize() );
  gl::clear();
}

CINDER_APP( FadingWavesApp, RendererGl )
