#define CI_MIN_LOG_LEVEL 0

// Dimensions
#define WIDTH 640
#define HEIGHT 640

// Shader
#define SCENE_SHADER "shaders/cellular.frag"
#define FEEDBACK_SHADER "shaders/feedback.frag"
#define POST_PROCESSING_SHADER "shaders/post_processing.frag"

// Assets
#define LUT_FILE "images/lookup_couleurs_bw.png"

// Recording
#define RECORD false
#define NUM_FRAMES 1000

#include "cinder/app/App.h"
#include "cinder/app/RendererGl.h"
#include "cinder/gl/gl.h"
#include "cinder/Log.h"

#include "cinder/qtime/AvfWriter.h"

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

class CouleursApp : public App {
public:
  CouleursApp();
	void setup() override;
	void mouseDown( MouseEvent event ) override;
	void update() override;
  
private:
  void initShaderFiles();
  void loadShaders();
  
  void setupUI();
  void setupScene();
  void setupMovieWriter();
  
  void updateOSC();
  void updateUI();
  void updateShaders();
  void updateMovieWriter();
  
  void drawUI();
  void drawScene();
  
  void resizeScene();
  
  void clearFBO( gl::FboRef fbo );
  
  osc::Listener           mOSCIn;
  
  qtime::MovieWriterRef   mMovieWriter;
  
  // Scene
  gl::FboRef              mSceneFbo;
  gl::GlslProgRef         mSceneShader;
  
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
  ci::gl::Texture2dRef    mLUT;
  gl::GlslProgRef         mPostProcessingShader;
  float                   mEdgeDetectionMixAmount = .0f;
  float                   mEdgeDetectionThreshold = .05f;
  float                   mMaskMixAmount = .0f;
  float                   mMaskSharpness = .05f;
  float                   mMaskRadius    = .5f;
  float                   mBlurRadius = 0.f;
  float                   mLUTMixAmount = 0.f;
  
  
  // Window Management
  ci::app::WindowRef			mUIWindow, mSceneWindow;
  
  bool                    mSceneIsSetup = false;
  
  std::vector<File>       mShaderFiles;
};

CouleursApp::CouleursApp()
{
  // OSC
  mOSCIn.setup( 3000 );
  
  // Window Management
  mUIWindow = getWindow();
  mUIWindow->setTitle( "Night Sea: Parameters" );
  mUIWindow->getSignalDraw().connect( bind( &CouleursApp::drawUI, this ) );
  
  mSceneWindow = createWindow( Window::Format().size( WIDTH, HEIGHT ) );
  mSceneWindow->setTitle( "Night Sea: Scene" );
  mSceneWindow->getSignalDraw().connect( bind( &CouleursApp::drawScene, this ) );
  mSceneWindow->getSignalResize().connect( bind( &CouleursApp::resizeScene, this ) );
}

void CouleursApp::setup()
{
  setupUI();
  setupScene();
  setupMovieWriter();
}

void CouleursApp::setupUI()
{
  mUIWindow->getRenderer()->makeCurrentContext();
  
  // UI
  ui::initialize( ui::Options()
                 .fonts( {
//                          { getAssetPath( "fonts/Roboto-Medium.ttf" ), 14.f },
//                          { getAssetPath( "fonts/Roboto-MediumItalic.ttf" ), 14.f },
//                          { getAssetPath( "fonts/Roboto-BoldItalic.ttf" ), 14.f },
//                          { getAssetPath( "fonts/fontawesome.ttf" ), 14.f }
                         } )
                 .window( mUIWindow )
                 .frameRounding( 0.0f )
                 );
}

void CouleursApp::setupScene()
{
  mSceneWindow->getRenderer()->makeCurrentContext();
  
  // Shaders
  initShaderFiles();
  loadShaders();
  
  // FBOs & Textures
  resizeScene();
  auto lutData = app::loadAsset( LUT_FILE );
  mLUT = gl::Texture2d::create( loadImage( lutData ) );
  
  // GL State
  gl::disableDepthRead();
  gl::disableDepthWrite();
  
  mSceneIsSetup = true;
}

void CouleursApp::setupMovieWriter() {
  if (RECORD) {
    fs::path path = getSaveFilePath();
    if ( !path.empty() ) {
      //    auto format = qtime::MovieWriter::Format().codec( qtime::MovieWriter::H264 ).fileType( qtime::MovieWriter::QUICK_TIME_MOVIE )
      //    .jpegQuality( 0.09f ).averageBitsPerSecond( 10000000 );
      mMovieWriter = qtime::MovieWriter::create( path, getWindowWidth(), getWindowHeight() );
    }
  }
}

void CouleursApp::resizeScene()
{
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
  mSceneFbo = gl::Fbo::create( w, h );
  
  clearFBO( mSceneFbo );
  clearFBO( mFeedbackFboPingPong );
  clearFBO( mPostProcessingFboPingPong );
}

// Shader paths
static fs::path scenePath               = SCENE_SHADER;
static fs::path feedbackPath            = FEEDBACK_SHADER;
static fs::path postProcessingPath      = POST_PROCESSING_SHADER;
static fs::path vertPath                = "shaders/passthrough.vert";

void CouleursApp::initShaderFiles()
{
  time_t now = time( 0 );
  mShaderFiles.push_back( { getAssetPath( scenePath ), now } );
  mShaderFiles.push_back( { getAssetPath( feedbackPath ), now } );
  mShaderFiles.push_back( { getAssetPath( postProcessingPath ), now } );
  mShaderFiles.push_back( { getAssetPath( vertPath ), now } );
}

void CouleursApp::loadShaders()
{
  DataSourceRef vert = app::loadAsset( vertPath );
  DataSourceRef sceneFrag = app::loadAsset( scenePath );
  DataSourceRef feedbackFrag = app::loadAsset( feedbackPath );
  DataSourceRef postProcessingFrag = app::loadAsset( postProcessingPath );
  
  try {
    mSceneShader = gl::GlslProg::create( gl::GlslProg::Format()
                                        .version( 330 )
                                        .vertex( vert )
                                        .fragment( sceneFrag ) );
    mFeedbackShader = gl::GlslProg::create( gl::GlslProg::Format()
                                           .version( 330 )
                                           .vertex( vert )
                                           .fragment( feedbackFrag ) );
    mPostProcessingShader = gl::GlslProg::create( gl::GlslProg::Format()
                                           .version( 330 )
                                           .vertex( vert )
                                           .fragment( postProcessingFrag )
                                           .define( "LUT_FLIP_Y" ) );
  }
  
  catch ( const std::exception &e ) {
    console() << "Shader exception: " << e.what() << std::endl;
  }
}

void CouleursApp::mouseDown( MouseEvent event )
{
  writeImage( "/Users/johanismael/Desktop/screenshot.png", copyWindowSurface() );
}

void CouleursApp::update()
{
  updateOSC();
  updateUI();
  updateShaders();
  updateMovieWriter();
}

void CouleursApp::updateOSC()
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

void CouleursApp::updateUI()
{
  // Draw UI ----------------------------------------------------------------
  {
    ui::ScopedMainMenuBar mainMenu;
//    ui::ScopedFont font( "Roboto-BoldItalic" );
    
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
      ui::SliderFloat( "B Amount", &mBlurRadius, 0.f, 8.f );
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

void CouleursApp::updateShaders()
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

void CouleursApp::updateMovieWriter()
{
  if ( mMovieWriter && RECORD && getElapsedFrames() > 1 && getElapsedFrames() < NUM_FRAMES )
    mMovieWriter->addFrame( copyWindowSurface() );
  else if ( mMovieWriter && getElapsedFrames() >= NUM_FRAMES ) {
    mMovieWriter->finish();
  }
}

void CouleursApp::drawUI()
{
  gl::clear( ColorA( 0.f, 0.f, 0.05f, 1.f ) );
  gl::color( ColorAf::white() );
  gl::printError();
}

void CouleursApp::drawScene()
{
  if ( !mSceneIsSetup ) return;
  
  {
    Rectf drawRect = Rectf( 0.f, 0.f, mSceneWindow->getWidth(), mSceneWindow->getHeight() );
    vec2 resolution = mSceneWindow->getSize();
    
    {
      // Scene
      gl::ScopedFramebuffer scopedFBO( mSceneFbo );
      gl::ScopedGlslProg shader( mSceneShader );
      mSceneShader->uniform( "u_resolution", resolution );
      mSceneShader->uniform( "u_time", (float)getElapsedSeconds() );
      gl::drawSolidRect( drawRect );
    }
    
    {
      // Feedback
      gl::ScopedFramebuffer scopedFBO( mFeedbackFboPingPong );
      gl::drawBuffer( GL_COLOR_ATTACHMENT0 + (GLenum)mFeedbackPing );
      gl::ScopedGlslProg shader( mFeedbackShader );
      gl::ScopedTextureBind sourceTexture( mSceneFbo->getColorTexture(), 0 );
      gl::ScopedTextureBind feedbackTexture( mFeedbackTextureFboPingPong[ mFeedbackPong ], 1 );
      gl::drawSolidRect( drawRect );
      mFeedbackPing = mFeedbackPong;
      mFeedbackPong = ( mFeedbackPing + 1 ) % 2;
    }
    
    {
      // Post Processing
      gl::ScopedGlslProg shader( mPostProcessingShader );
      gl::ScopedTextureBind inputTexture( mFeedbackTextureFboPingPong[ mFeedbackPong ], 0 );
      gl::ScopedTextureBind lookup_table( mLUT, 1 );
      mPostProcessingShader->uniform( "u_mix_amount", mLUTMixAmount );
      gl::drawSolidRect( drawRect );
    }
  }
  
  gl::printError();
}

void CouleursApp::clearFBO( gl::FboRef fbo )
{
  gl::ScopedFramebuffer scopedFramebuffer( fbo );
  gl::ScopedViewport scopedViewport( ivec2( 0 ), fbo->getSize() );
  gl::clear();
}

CINDER_APP( CouleursApp, RendererGl )
