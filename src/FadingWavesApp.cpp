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

namespace cinder {
  namespace gl {
    void printError() {
      GLenum errorFlag = getError();
      if ( errorFlag != GL_NO_ERROR ) {
        CI_LOG_E( "glGetError flag set: " << getErrorString( errorFlag ) );
      }
    }
  }
}

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
  
private:
  void initShaderFiles();
  void loadShaders();
  
  void setupUI();
  void setupScene();
  
  void updateOSC();
  void updateUI();
  void updateShaders();
  
  void drawUI();
  void drawScene();
  
  void clearFBO( gl::FboRef fbo );
  
  osc::Listener           mOSCIn;
  
  // Source
  gl::FboRef              mSourceFbo;
  gl::GlslProgRef         mCellularShader;
  
  // Feedback
  gl::FboRef              mFeedbackFboPingPong;
  gl::Texture2dRef        mFeedbackTextureFboPingPong[ 2 ];
  size_t                  mFeedbackPing = 0;
  size_t                  mFeedbackPong = 1;
  gl::GlslProgRef         mFeedbackShader;
  
  // Post-Processing
  gl::FboRef              mPostProcessingFboPingPong;
  gl::Texture2dRef        mPostProcessingTextureFboPingPong[ 2 ];
  size_t                  mPostProcessingPing = 0;
  size_t                  mPostProcessingPong = 1;
  
  // Edge Detection
  gl::GlslProgRef         mEdgeDetectionShader;
  float                   mEdgeDetectionMixAmount = .5f;
  float                   mEdgeDetectionThreshold = .05f;
  
  // Mask
  gl::GlslProgRef         mMaskShader;
  float                   mMaskMixAmount = 1.f;
  float                   mMaskSharpness = .05f;
  float                   mMaskRadius    = .5f;
  
  // LUT
  gl::GlslProgRef         mLUTShader;
  float                   mLUTMixAmount = 1.f;
  
  // Window Management
  ci::app::WindowRef			mUIWindow, mSceneWindow;
  
  bool                    mSceneIsSetup = false;
  
  std::vector<File>       mShaderFiles;
};

FadingWavesApp::FadingWavesApp()
{
  // OSC
  mOSCIn.setup( 3000 );
  
  // Window Management
  mUIWindow = getWindow();
  mUIWindow->setTitle( "Night Sea: Parameters" );
  mUIWindow->getSignalDraw().connect( bind( &FadingWavesApp::drawUI, this ) );
  
  mSceneWindow = createWindow( Window::Format().size( 1280, 720 ) );
  mSceneWindow->setTitle( "Night Sea: Scene" );
  mSceneWindow->getSignalDraw().connect( bind( &FadingWavesApp::drawScene, this ) );
}

void FadingWavesApp::setup()
{
  setupUI();
  setupScene();
}

void FadingWavesApp::setupUI()
{
  mUIWindow->getRenderer()->makeCurrentContext();
  
  // UI
  ui::initialize( ui::Options()
                 .fonts( {
                          { getAssetPath( "fonts/Roboto-Medium.ttf" ), 14.f },
                          { getAssetPath( "fonts/Roboto-MediumItalic.ttf" ), 14.f },
                          { getAssetPath( "fonts/Roboto-BoldItalic.ttf" ), 14.f },
                          { getAssetPath( "fonts/fontawesome.ttf" ), 14.f }
                         } )
                 .window( mUIWindow )
                 .frameRounding( 0.0f )
                 );
}

void FadingWavesApp::setupScene()
{
  mSceneWindow->getRenderer()->makeCurrentContext();
  
  auto w = mSceneWindow->getWidth();
  auto h = mSceneWindow->getHeight();
  
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
  
  mSceneIsSetup = true;
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
  // Draw UI ----------------------------------------------------------------
  {
    ui::ScopedMainMenuBar mainMenu;
    ui::ScopedFont font( "Roboto-BoldItalic" );
    
    if ( ui::BeginMenu( "NightSea" ) ) {
      if ( ui::MenuItem( "QUIT" ) ) {
        quit();
      }
      ui::EndMenu();
    }
  }
  
  {
    ui::ScopedWindow win( "Drawing" );
    
    if ( ui::CollapsingHeader( "Edge Detection" ) ) {
      ui::SliderFloat( "ED Threshold", &mEdgeDetectionThreshold, 0.f, 1.f );
      ui::SliderFloat( "ED Mix",       &mEdgeDetectionMixAmount, 0.f, 1.f );
    }
    
    if ( ui::CollapsingHeader( "Vignette" ) ) {
      ui::SliderFloat( "V Sharpness", &mMaskSharpness, 0.f, 1.f );
      ui::SliderFloat( "V Radius",    &mMaskRadius,    0.f, 1.f );
      ui::SliderFloat( "V Mix",       &mMaskMixAmount, 0.f, 1.f );
    }
    
    if ( ui::CollapsingHeader( "Distorsion" ) ) {
      
    }
    
    if ( ui::CollapsingHeader( "Blur" ) ) {
      
    }
    
    if ( ui::CollapsingHeader( "LUT" ) ) {
      ui::SliderFloat( "LUT Mix", &mLUTMixAmount, 0.f, 1.f );
    }
  }
  
  {
    ui::ScopedWindow win( "Performance" );
    ui::Text( "FPS: %d", (int)getAverageFps() );
  }
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

void FadingWavesApp::drawUI()
{
  gl::clear( ColorA( 0.f, 0.f, 0.05f, 1.f ) );
  gl::color( ColorAf::white() );
  gl::printError();
}

void FadingWavesApp::drawScene()
{
  gl::clear();
  
  if ( !mSceneIsSetup ) return;
  
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
    
    Rectf drawRect = Rectf( 0.f, 0.f, mSceneWindow->getWidth(), mSceneWindow->getHeight() );
    vec2 resolution = mSceneWindow->getSize();
    
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
