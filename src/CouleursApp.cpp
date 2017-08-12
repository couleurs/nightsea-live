#define CI_MIN_LOG_LEVEL 0

#define PROJECT_NAME "001"

// Dimensions
#define SCENE_WIDTH 640
#define SCENE_HEIGHT 640
#define UI_WIDTH 600
#define UI_HEIGHT 400
#define WINDOW_PADDING 20

// Shaders
#define SHADER_FOLDER "shaders/projects/"
#define SCENE_SHADER "/scene.frag"
#define FEEDBACK_SHADER "/feedback.frag"
#define POST_PROCESSING_SHADER "/post_processing.frag"

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
#include "cinder/Timer.h"

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
  void updateTimer();
  
  void drawUI();
  void drawScene();
  void bindCommonUniforms( gl::GlslProgRef shader );
  
  void resizeScene();
  
  void clearFBO( gl::FboRef fbo );
  
  osc::Listener           mOSCIn;
  qtime::MovieWriterRef   mMovieWriter;
  std::vector<File>       mShaderFiles;
  bool                    mSceneIsSetup = false;
  
  // BPM
  ci::Timer               mTimer;
  int                     mBPM = 125;
  float                   mTick; // [0 - 1]
  
  // Scene
  gl::FboRef              mSceneFbo;
  gl::GlslProgRef         mSceneShader;
  
  // Feedback
  gl::FboRef              mFeedbackFbo1;
  gl::FboRef              mFeedbackFbo2;
  gl::GlslProgRef         mFeedbackShader;
  int                     mFeedbackFboCount = 0;
  float                   mFeedbackAmount = .95f;
  float                   mFeedbackScale = .99f;
  
  // Post-Processing
  ci::gl::Texture2dRef    mLUT;
  gl::GlslProgRef         mPostProcessingShader;
  float                   mEdgeDetectionMixAmount = .0f;
  float                   mEdgeDetectionThreshold = .05f;
  float                   mMaskMixAmount = .0f;
  float                   mMaskSharpness = .05f;
  float                   mMaskRadius    = .5f;
  float                   mBlurRadius = 0.f;
  float                   mLUTMixAmount = .9f;
  
  // Window Management
  ci::app::WindowRef			mUIWindow, mSceneWindow;
  
};

CouleursApp::CouleursApp()
{
  // OSC
  mOSCIn.setup( 3000 );
  
  // Window Management
  mUIWindow = getWindow();
  mUIWindow->setTitle( "Couleurs: UI" );
  mUIWindow->getSignalDraw().connect( bind( &CouleursApp::drawUI, this ) );
  mUIWindow->setPos(WINDOW_PADDING, 3. * WINDOW_PADDING);
  mUIWindow->setSize(UI_WIDTH, UI_HEIGHT);
  
  mSceneWindow = createWindow( Window::Format().size( SCENE_WIDTH, SCENE_HEIGHT ) );
  mSceneWindow->setTitle( "Couleurs: Render" );
  mSceneWindow->getSignalDraw().connect( bind( &CouleursApp::drawScene, this ) );
  mSceneWindow->getSignalResize().connect( bind( &CouleursApp::resizeScene, this ) );
}

void CouleursApp::setup()
{
  setupUI();
  setupScene();
  setupMovieWriter();
  mTimer.start();
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

  mSceneFbo = gl::Fbo::create( w, h );
  mFeedbackFbo1 = gl::Fbo::create( w, h );
  mFeedbackFbo2 = gl::Fbo::create( w, h );
  
  clearFBO( mSceneFbo );
  clearFBO( mFeedbackFbo1 );
  clearFBO( mFeedbackFbo2 );
}

// Shader paths
static fs::path scenePath          = string(SHADER_FOLDER) + string(PROJECT_NAME) + string(SCENE_SHADER);
static fs::path feedbackPath       = string(SHADER_FOLDER) + string(PROJECT_NAME) + string(FEEDBACK_SHADER);
static fs::path postProcessingPath = string(SHADER_FOLDER) + string(PROJECT_NAME) + string(POST_PROCESSING_SHADER);;
static fs::path vertPath           = "shaders/vertex/passthrough.vert";

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
  updateTimer();
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
    ui::ScopedWindow win( "Parameters" );
    
    if ( ui::CollapsingHeader( "Scene", ImGuiTreeNodeFlags_DefaultOpen ) ) {
    }
    
    if ( ui::CollapsingHeader( "Feedback", ImGuiTreeNodeFlags_DefaultOpen ) ) {
      ui::SliderFloat( "Feedback Scale",      &mFeedbackScale,          0.f, 2.f );
      ui::SliderFloat( "Feedback Amount",     &mFeedbackAmount,         0.f, 1.f );
    }
    
    if ( ui::CollapsingHeader( "Post Processing", ImGuiTreeNodeFlags_DefaultOpen ) ) {
      ui::SliderFloat( "Edge Threshold",      &mEdgeDetectionThreshold, 0.f, 1.f );
      ui::SliderFloat( "Edge Mix",            &mEdgeDetectionMixAmount, 0.f, 1.f );
      ui::SliderFloat( "Vignette Sharpness",  &mMaskSharpness,          0.f, 1.f );
      ui::SliderFloat( "Vignette Radius",     &mMaskRadius,             0.f, 1.f );
      ui::SliderFloat( "Vignette Mix",        &mMaskMixAmount,          0.f, 1.f );
      ui::SliderFloat( "Blur Amount",         &mBlurRadius,             0.f, 8.f );
      ui::SliderFloat( "LUT Mix",             &mLUTMixAmount,           0.f, 1.f );
    }
  }
  
  {
    ui::ScopedWindow win( "Performance" );
    ui::Text( "FPS: %d", (int)getAverageFps() );
  }
  
  {
    ui::ScopedWindow win( "AV Sync" );
    ui::SliderInt( "BPM", &mBPM, 20.f, 200.f );
    auto draw = ui::GetWindowDrawList();
    vec2 p = (vec2)ui::GetCursorScreenPos() + vec2( 0.f, 3.f );
    vec2 size( ui::GetContentRegionAvailWidth() * .7f, ui::GetTextLineHeightWithSpacing() );
    ImU32 c = ImColor( .8f, 0.f, 0.f, 1.f );
    draw->AddRectFilled( p, vec2( p.x + size.x * mTick, p.y + size.y ), c );
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

void CouleursApp::updateTimer()
{
  double t = mTimer.getSeconds();
  float bps = mBPM / 60.f;
  float beatLengthSeconds = 1.f / bps;
  mTick = ( fmod( t, beatLengthSeconds ) ) / beatLengthSeconds;
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
    
    {
      // Scene
      gl::ScopedFramebuffer scopedFBO( mSceneFbo );
      gl::ScopedGlslProg shader( mSceneShader );
      bindCommonUniforms( mSceneShader );
      gl::drawSolidRect( drawRect );
    }
    
    {
      bool fboSwap = (mFeedbackFboCount % 2 == 0);
      auto fboOut = fboSwap ? mFeedbackFbo1 : mFeedbackFbo2;
      auto fboIn =  fboSwap ? mFeedbackFbo2 : mFeedbackFbo1;
      
      {
        // Feedback
        gl::ScopedFramebuffer scopedFBO( fboOut );
        gl::ScopedGlslProg shader( mFeedbackShader );
        gl::ScopedTextureBind sourceTexture( mSceneFbo->getColorTexture(), 0 );
        gl::ScopedTextureBind feedbackTexture( fboIn->getColorTexture(), 1 );
        mFeedbackShader->uniform( "u_texSource", 0 );
        mFeedbackShader->uniform( "u_texFeedback", 1 );
        mFeedbackShader->uniform( "u_feedbackAmount", mFeedbackAmount );
        mFeedbackShader->uniform( "u_feedbackScale", mFeedbackScale );
        bindCommonUniforms( mFeedbackShader );
        gl::drawSolidRect( drawRect );
        mFeedbackFboCount++;
      }
      
      {
        // Post Processing
        gl::ScopedGlslProg shader( mPostProcessingShader );
        gl::ScopedTextureBind inputTexture( fboOut->getColorTexture(), 0 );
        gl::ScopedTextureBind lookupTable( mLUT, 1 );
        mPostProcessingShader->uniform( "u_texInput", 0 );
        mPostProcessingShader->uniform( "u_texLUT", 1 );
        mPostProcessingShader->uniform( "u_mixAmount", mLUTMixAmount );
        bindCommonUniforms( mPostProcessingShader );
        gl::drawSolidRect( drawRect );
      }
    }
  }
  
  gl::printError();
}

void CouleursApp::bindCommonUniforms( gl::GlslProgRef shader )
{
  vec2 resolution = mSceneWindow->getSize();
  shader->uniform( "u_resolution", resolution );
  shader->uniform( "u_time", (float)getElapsedSeconds() );
  shader->uniform( "u_tick", mTick );
}

void CouleursApp::clearFBO( gl::FboRef fbo )
{
  gl::ScopedFramebuffer scopedFramebuffer( fbo );
  gl::ScopedViewport scopedViewport( ivec2( 0 ), fbo->getSize() );
  gl::clear();
}

CINDER_APP( CouleursApp, RendererGl )
