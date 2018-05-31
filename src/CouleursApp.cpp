// Cinder
#include "cinder/app/App.h"
#include "cinder/app/RendererGl.h"
#include "cinder/gl/gl.h"
#include "cinder/Log.h"
#include "cinder/qtime/AvfWriter.h"
#include "cinder/Timer.h"
#include "cinder/audio/Voice.h"
#include "cinder/CinderMath.h"

// Blocks
#include "Osc.h"
#include "CinderImGui.h"
#include "MidiIn.h"
#include "MidiMessage.h"
#include "MidiConstants.h"
#include "Watchdog.h"

// C
#include <ctime>
//#include <stdlib.h>

// Couleurs
#include "Parameters.hpp"
#include "Constants.h"


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
  time_t   modified;
} File;

typedef struct {
  float feedbackAmount, feedbackScale;
  float lutMix;
  float grainAmount;
} Parameter;

class CouleursApp : public App {
public:
  CouleursApp();
  void setup() override;
  void update() override;
  void keyDown( KeyEvent event ) override;
  
private:
  void initShaderWatching();
  void loadShaders();
  
  // Setup
  void setupUI();
  void setupScene();
  void setupMovieWriter();
  void setupMidi();
  
  // Update
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
  
  void abletonMidiListener( midi::Message msg );
  void controllerMidiListener( midi::Message msg );
  
//  osc::Listener                mOSCIn;
  midi::Input                  mAbletonMidiIn, mControllerMidiIn;
  
  Parameters                   mParams;
  int                          mNumSections;
  
  qtime::MovieWriterRef        mMovieWriter;
  std::vector<File>            mShaderFiles;
  bool                         mSceneIsSetup = false;
  
  // Time
  float                        mTime = 0;
  bool                         mTimeStopped = false;
  
  // AV Sync
  ci::Timer                    mTimer;
  int                          mBPM = 107;
  float                        mTick; //[0 - 1]
  int                          mSection = 0;
  
  // Scene
  ci::gl::Texture2dRef         mRandomTexture, mInputTexture;
  gl::FboRef                   mSceneFbo;
  gl::GlslProgRef              mSceneShader;
  float                        mSmooth = .058f;
  float                        mSpeed = .1f;
  
  // Feedback
  gl::FboRef                   mFeedbackFbo1, mFeedbackFbo2;
  gl::GlslProgRef              mFeedbackShader;
  int                          mFeedbackFboCount = 0;
  
  // Post-Processing
  ci::gl::Texture2dRef         mColorPaletteLUT, mPostProcessingLUT;
  gl::FboRef                   mPostProcessingFbo1, mPostProcessingFbo2;
  std::vector<gl::GlslProgRef> mPostProcessingShaders;
  int                          mNumPostProcessors;
  int                          mPostProcessingFboCount = 0;
  float                        mGrainAmount = 0.051f;
  
  // Window Management
  ci::app::WindowRef       mUIWindow, mSceneWindow;
  
  // Error Handling
  bool                     mShaderCompilationFailed = false;
  std::string              mShaderCompileErrorMessage;
};

CouleursApp::CouleursApp() :
  mParams( string( SHADER_FOLDER ) + string( PROJECT_NAME ) + string( PARAMS_FILE ) )
{
  // OSC
//  mOSCIn.setup( OSC_PORT );
  
  // Window Management
  mUIWindow = getWindow();
  mUIWindow->setTitle( "Couleurs: UI" );
  mUIWindow->getSignalDraw().connect( bind( &CouleursApp::drawUI, this ) );
  mUIWindow->setPos( WINDOW_PADDING, 3. * WINDOW_PADDING );
  mUIWindow->setSize( UI_WIDTH, UI_HEIGHT );
  
  mSceneWindow = createWindow( Window::Format().size( SCENE_WIDTH, SCENE_HEIGHT ) );
  mSceneWindow->setTitle( "Couleurs: Render" );
  mSceneWindow->getSignalDraw().connect( bind( &CouleursApp::drawScene, this ) );
  mSceneWindow->getSignalResize().connect( bind( &CouleursApp::resizeScene, this ) );
//  mSceneWindow->setFullScreen();
  
  setupMidi();
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
  auto color = ImVec4( .85f, .87f, .92f, .76f );
  ui::initialize( ui::Options()
                 .window( mUIWindow )
                 .frameRounding( 0.0f )
                 .color( ImGuiCol_TitleBgActive, ImVec4( color.x, color.y, color.z, .76f ) )
                 .color( ImGuiCol_Header, ImVec4( color.x, color.y, color.z, .76f ) )
                 .color( ImGuiCol_HeaderHovered, ImVec4( color.x, color.y, color.z, .86f ) )
                 .color( ImGuiCol_HeaderActive, ImVec4( color.x, color.y, color.z, 1.f ) )
                 .color( ImGuiCol_ButtonHovered, ImVec4( color.x, color.y, color.z, .86f ) )
                );
}

void CouleursApp::setupScene()
{
  mSceneWindow->getRenderer()->makeCurrentContext();
  
  // Shaders
  loadShaders();
  initShaderWatching();
  
  // FBOs & Textures
  resizeScene();
  mColorPaletteLUT = gl::Texture2d::create( loadImage( app::loadAsset( COLOR_PALETTE_LUT ) ) );
  mPostProcessingLUT = gl::Texture2d::create( loadImage( app::loadAsset( POST_PROCESSING_LUT ) ) );
  mRandomTexture = gl::Texture2d::create( loadImage( app::loadAsset( "images/generative/texRandom.png" ) ) );
  mInputTexture = gl::Texture2d::create( loadImage( app::loadAsset( INPUT_TEXTURE ) ) );
  
  // GL State
  gl::disableDepthRead();
  gl::disableDepthWrite();
  
  mSceneIsSetup = true;
}

void CouleursApp::setupMovieWriter()
{
  if (RECORD) {
    fs::path path = getSaveFilePath();
    if ( !path.empty() ) {
      //    auto format = qtime::MovieWriter::Format().codec( qtime::MovieWriter::H264 ).fileType( qtime::MovieWriter::QUICK_TIME_MOVIE )
      //    .jpegQuality( 0.09f ).averageBitsPerSecond( 10000000 );
      mMovieWriter = qtime::MovieWriter::create( path, getWindowWidth(), getWindowHeight() );
    }
  }
}

void CouleursApp::setupMidi()
{
  if ( mAbletonMidiIn.getNumPorts() > 0 ) {
    mAbletonMidiIn.listPorts();
    mAbletonMidiIn.openPort( 0 );
    cout << "Opening MIDI port 0" << endl;
    mAbletonMidiIn.midiSignal.connect( bind( &CouleursApp::abletonMidiListener, this, placeholders::_1 ) );
  }
  else {
    cout << "No MIDI ports found" << endl;
  }
  
  if ( mControllerMidiIn.getNumPorts() > MIDI_CONTROLLER_PORT ) {
    mControllerMidiIn.openPort( MIDI_CONTROLLER_PORT );
//    cout << "Opening MIDI port 2" << endl;
    mControllerMidiIn.midiSignal.connect( bind( &CouleursApp::controllerMidiListener, this, placeholders::_1 ) );
  }
  else {
    cout << "No MIDI ports found" << endl;
  }
}

void CouleursApp::controllerMidiListener( midi::Message msg )
{
  auto param = mParams.getParamForMidiNumber( msg.control );
  if ( param != nullptr ) {
    console() << "found param: " << param->name << endl;
    param->value = lmap( (float)msg.value, 0.f, 127.f, param->min, param->max );
  }
  console() << "msg value: " << msg.value << "|| msg control: " << msg.control << endl;
}

void CouleursApp::abletonMidiListener( midi::Message msg )
{
  switch ( msg.status ) {
    case MIDI_START:
      console() << "MIDI START" << endl;
      mTimer.stop();
      mTimer.start();
      break;
    case MIDI_STOP:
      console() << "MIDI STOP" << endl;
      mTimer.stop();
      mTimer.start();
      break;
    case MIDI_TIME_CLOCK:
//      cout << "TIME CLOCK: " << msg.value << endl;  
      break;
  }
}

void CouleursApp::resizeScene()
{
  auto w = mSceneWindow->getWidth();
  auto h = mSceneWindow->getHeight();
  
  mSceneFbo = gl::Fbo::create( w, h );
  mFeedbackFbo1 = gl::Fbo::create( w, h );
  mFeedbackFbo2 = gl::Fbo::create( w, h );
  mPostProcessingFbo1 = gl::Fbo::create( w, h );
  mPostProcessingFbo2 = gl::Fbo::create( w, h );
  
  clearFBO( mSceneFbo );
  clearFBO( mFeedbackFbo1 );
  clearFBO( mFeedbackFbo2 );
  clearFBO( mPostProcessingFbo1 );
  clearFBO( mPostProcessingFbo2 );
}

// Shader paths
static fs::path scenePath          = string( SHADER_FOLDER ) + string( PROJECT_NAME ) + string( SCENE_SHADER );
static fs::path feedbackPath       = string( SHADER_FOLDER ) + string( PROJECT_NAME ) + string( FEEDBACK_SHADER );
static fs::path postProcessingPath = string( SHADER_FOLDER ) + string( PROJECT_NAME ) + string( POST_PROCESSING_SHADER );
static fs::path vertPath           = "shaders/vertex/passthrough.vert";

void CouleursApp::initShaderWatching() //TODO: replace this by watchdog?
{
  time_t now = time( 0 );
  mShaderFiles.push_back( { getAssetPath( scenePath ), now } );
  mShaderFiles.push_back( { getAssetPath( feedbackPath ), now } );
  
  for ( int i = 0; i < mNumPostProcessors; i++ ) {
    auto path = string( SHADER_FOLDER ) + string( PROJECT_NAME ) + string( POST_PROCESSING_SHADER ) + to_string( i ) + ".frag";
    mShaderFiles.push_back( { getAssetPath( path ), now } );
  }
  
  mShaderFiles.push_back( { getAssetPath( vertPath ), now } );
}

void CouleursApp::loadShaders()
{
  DataSourceRef vert = app::loadAsset( vertPath );
  DataSourceRef sceneFrag = app::loadAsset( scenePath );
  DataSourceRef feedbackFrag = app::loadAsset( feedbackPath );
  
  try {
    mSceneShader = gl::GlslProg::create( gl::GlslProg::Format()
                                        .version( 330 )
                                        .vertex( vert )
                                        .fragment( sceneFrag ) );
    mFeedbackShader = gl::GlslProg::create( gl::GlslProg::Format()
                                           .version( 330 )
                                           .vertex( vert )
                                           .fragment( feedbackFrag ) );
    mPostProcessingShaders.clear();
        
    int count = 0;
    while ( true ) {
      auto path = string( SHADER_FOLDER ) + string( PROJECT_NAME ) + string( POST_PROCESSING_SHADER ) + to_string( count ) + ".frag";
      auto fullPath = getAssetPath( path );
      if ( fs::exists( fullPath ) ) {
        auto postProcessingFrag = app::loadAsset( path );
        auto shader = gl::GlslProg::create( gl::GlslProg::Format()
                                           .version( 330 )
                                           .vertex( vert )
                                           .fragment( postProcessingFrag )
                                           .define( "LUT_FLIP_Y" ) );
        mPostProcessingShaders.push_back( shader );
        count++;
      }
      else {
        mNumPostProcessors = count;
        break;
      }
    }
    
    mShaderCompilationFailed = false;
  }
  
  catch ( const std::exception &e ) {
    console() << "Shader exception: " << e.what() << std::endl;
    mShaderCompilationFailed = true;
    mShaderCompileErrorMessage = string( e.what() );
  }
}

void CouleursApp::keyDown( KeyEvent event )
{
  if ( event.getCode() == KeyEvent::KEY_s ) {
    CI_LOG_I( "Saving config file" );
    mParams.save();
  }
  else if ( event.getCode() == KeyEvent::KEY_f ) {
    CI_LOG_I( "Saving screenshot" );
    const char *homeDir = getenv( "HOME" );    
    writeImage( string( homeDir ) + string( "/Desktop/screenshot_" ) + to_string( getElapsedSeconds() ) + string( ".png" ), copyWindowSurface() );
  }
  else if ( event.getCode() == KeyEvent::KEY_r ) {
    CI_LOG_I( "Resetting params" );
    mParams.reload();
  }
  else if ( event.getCode() == KeyEvent::KEY_t ) {
    mTimeStopped = !mTimeStopped;
  }
  else if ( event.getCode() == KeyEvent::KEY_RIGHTBRACKET ) {
    mTime += .1f;
  }
  else if ( event.getCode() == KeyEvent::KEY_LEFTBRACKET ) {
    mTime -= .1f;
  }
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
//  while ( mOSCIn.hasWaitingMessages() ) {
//    osc::Message message;
//    mOSCIn.getNextMessage( &message );
//    string address = message.getAddress();
//    float value = message.getArgAsFloat( 0 );
//    
//    if ( address == "/1/Size" ) {
//      mSmooth = value;
//    }
//  }
}

void CouleursApp::updateUI()
{
  // Draw UI
  {
    ui::ScopedMainMenuBar mainMenu;    
    
    if ( ui::BeginMenu( "Couleurs" ) ) {
      if ( ui::MenuItem( "Reset" ) ) {
        mParams.reload();
      }
      if ( ui::MenuItem( "QUIT" ) ) {
        quit();
      }
      ui::EndMenu();
    }
  }
  
  {
    ui::ScopedWindow win( "Parameters" );
    auto params = mParams.get();
    for (auto it = params.begin(); it != params.end(); it++ ) {
      auto param = *it;
      ui::SliderFloat( param->name.c_str(), &param->value, param->min, param->max );
    }
  }
  
  {
    ui::ScopedWindow win( "Performance" );
    ui::Text( "FPS: %d", (int)getAverageFps() );
  }
  
  {
    ui::ScopedWindow win( "AV Sync" );
    ui::SliderInt( "Section", &mSection, 0, mNumSections - 1 );
    ui::SliderInt( "BPM", &mBPM, 20, 200 );
    auto draw = ui::GetWindowDrawList();
    vec2 p = (vec2)ui::GetCursorScreenPos() + vec2( 0.f, 3.f );
    vec2 size( ui::GetContentRegionAvailWidth() * .7f, ui::GetTextLineHeightWithSpacing() );
    auto c = ImColor( .85f, .87f, .92f, .76f );
    draw->AddRectFilled( p, vec2( p.x + size.x * mTick, p.y + size.y ), c );
  }
  
  {
    if ( mShaderCompilationFailed ) {
      ui::ScopedStyleColor color( ImGuiCol_TitleBgActive, ImVec4( .9f, .1f, .1f, .85f ) );
      ui::ScopedWindow win( "Debug" );      
      ui::Text( "%s", mShaderCompileErrorMessage.c_str() );
    }
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
      gl::ScopedTextureBind lookupTable( mRandomTexture, 0 );
      gl::ScopedTextureBind inputTexture( mInputTexture, 1 );
      mSceneShader->uniform( "u_texRandom", 0 );
      mSceneShader->uniform( "u_texInput", 1 );
      bindCommonUniforms( mSceneShader );
      gl::drawSolidRect( drawRect );
    }
    
    {
      // Feedback
      bool feedbackFBOSwap = ( mFeedbackFboCount % 2 == 0 );
      auto feedbackFBOOut = feedbackFBOSwap ? mFeedbackFbo1 : mFeedbackFbo2;
      auto feedbackFBOIn =  feedbackFBOSwap ? mFeedbackFbo2 : mFeedbackFbo1;
      
      {
        gl::ScopedFramebuffer scopedFBO( feedbackFBOOut );
        gl::ScopedGlslProg shader( mFeedbackShader );
        gl::ScopedTextureBind sourceTexture( mSceneFbo->getColorTexture(), 0 );
        gl::ScopedTextureBind feedbackTexture( feedbackFBOIn->getColorTexture(), 1 );
        mFeedbackShader->uniform( "u_texSource", 0 );
        mFeedbackShader->uniform( "u_texFeedback", 1 );
        bindCommonUniforms( mFeedbackShader );
        gl::drawSolidRect( drawRect );
        mFeedbackFboCount++;
      }
      
      // Post-Processing
      auto input = feedbackFBOOut->getColorTexture();
      auto numPPs = mPostProcessingShaders.size();
      for ( int i = 0; i < numPPs; i++ ) {
        bool isLastPass = ( i == numPPs - 1 );
        bool ppFBOSwap = ( mPostProcessingFboCount % 2 == 0 );
        auto ppFBOOut = ppFBOSwap ? mPostProcessingFbo1 : mPostProcessingFbo2;
        auto ppFBOIn =  ppFBOSwap ? mPostProcessingFbo2 : mPostProcessingFbo1;
        
        // Input: feed result of last pass into next one, except for the first one
        if ( i > 0 ) {
          input = ppFBOIn->getColorTexture();
        }
        
        // Output: last pass draws to screen
        if ( !isLastPass ) {
          ppFBOOut->bindFramebuffer();
        }
        
        // Draw
        auto postProcessingShader = mPostProcessingShaders[ i ];
        gl::ScopedGlslProg shader( postProcessingShader );
        gl::ScopedTextureBind inputTexture( input, 0 );
        gl::ScopedTextureBind lookupTable( mPostProcessingLUT, 1 );
        gl::ScopedTextureBind colorTable1( mColorPaletteLUT, 2 );
        postProcessingShader->uniform( "u_texInput", 0 );
        postProcessingShader->uniform( "u_texLUT", 1 );
        postProcessingShader->uniform( "u_texColors", 2 );        
        bindCommonUniforms( postProcessingShader );
        gl::drawSolidRect( drawRect );
        mPostProcessingFboCount++;
        
        if ( !isLastPass ) {
          ppFBOOut->unbindFramebuffer();
        }
      }
    }
  }
  
  gl::printError();
}

void CouleursApp::bindCommonUniforms( gl::GlslProgRef shader )
{
  auto contentScale = mSceneWindow->getContentScale();
  vec2 resolution = mSceneWindow->getSize() * ivec2( contentScale, contentScale );
  shader->uniform( "u_resolution", resolution );
  if (!mTimeStopped) {
    mTime = (float)getElapsedSeconds();
  }
  shader->uniform( "u_time", mTime );
  shader->uniform( "u_tick", mTick );
  shader->uniform( "u_section", mSection );
    
  auto params = mParams.get();
  for (auto it = params.begin(); it != params.end(); it++ ) {
      shader->uniform( (*it)->name, (*it)->value );
  }
}

void CouleursApp::clearFBO( gl::FboRef fbo )
{
  gl::ScopedFramebuffer scopedFramebuffer( fbo );
  gl::ScopedViewport scopedViewport( ivec2( 0 ), fbo->getSize() );
  gl::clear();
}

CINDER_APP( CouleursApp, RendererGl, [&]( App::Settings *settings ) {
//  settings->setHighDensityDisplayEnabled();
})
