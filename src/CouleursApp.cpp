#define CI_MIN_LOG_LEVEL 0

// Project
#define PROJECT_NAME "shed"
#define NUM_SECTIONS 4
#define NUM_POST_PROCESSORS 4

// Dimensions
#define SCENE_WIDTH 640 //2560x1440
#define SCENE_HEIGHT 480
#define UI_WIDTH 600
#define UI_HEIGHT 400
#define WINDOW_PADDING 20

// Shaders
#define SHADER_FOLDER "shaders/projects/"
#define SCENE_SHADER "/scene.frag"
#define FEEDBACK_SHADER "/feedback.frag"
#define POST_PROCESSING_SHADER "/post_processing_"

// Assets
#define COLOR_PALETTE_LUT_FILE "images/shed/lookup_shed_1.png"
#define POST_PROCESSING_LUT_FILE "images/lookup_couleurs_bw.png"
#define MUSIC_FILE "sounds/music/shed.mp3"

// Config
#define CONFIG_FILE "/params.json"

// Recording
#define RECORD false
#define NUM_FRAMES 1000

// OSC
#define OSC_PORT 9001

#include "cinder/app/App.h"
#include "cinder/app/RendererGl.h"
#include "cinder/gl/gl.h"
#include "cinder/Log.h"
#include "cinder/qtime/AvfWriter.h"
#include "cinder/Timer.h"
#include "cinder/audio/Voice.h"

// Blocks
#include "OscListener.h"
#include "CinderImGui.h"
#include "MidiIn.h"
#include "MidiMessage.h"
#include "MidiConstants.h"

#include "Config.hpp"

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
  time_t   modified;
} File;

typedef struct {
  float tickSensitivity;
  float speed;
  float feedbackAmount;
  float feedbackScale;
  float randomDisplacement;
  float lutMix;
  int   blurKernelSize;
  float blurRadius;
} Parameter;

class CouleursApp : public App {
public:
  CouleursApp();
  void setup() override;
  void update() override;
  void keyDown( KeyEvent event ) override;
  
private:
  void initShaderFiles();
  void loadShaders();
  
  // Setup
  void setupUI();
  void setupScene();
  void setupMovieWriter();
  void setupMusic();
  void setupMidi();
  void setupParams();
  
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
  
  void midiListener( midi::Message msg );
  
  osc::Listener                mOSCIn;
  midi::Input                  mMidiIn;
  
  Config                       mConfig;
  
  qtime::MovieWriterRef        mMovieWriter;
  std::vector<File>            mShaderFiles;
  bool                         mSceneIsSetup = false;
  audio::VoiceRef              mMusic;
  
  // AV Sync
  ci::Timer                    mTimer;
  int                          mBPM = 125;
  float                        mTick; //[0 - 1]
  int                          mSection = 0;
  
  // Scene
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
  int                          mPostProcessingFboCount = 0;
  float                        mGrainAmount = 0.043f;
  
  // Parameters
  std::vector<Parameter *> mParameters;
  
  // Window Management
  ci::app::WindowRef       mUIWindow, mSceneWindow;
};

CouleursApp::CouleursApp() :
  mConfig( string( SHADER_FOLDER ) + string( PROJECT_NAME ) + string( CONFIG_FILE ) )
{
  // OSC
  mOSCIn.setup( OSC_PORT );
  
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
  setupParams();
}

void CouleursApp::setup()
{
  setupUI();
  setupScene();
  setupMovieWriter();
  setupMusic();
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
  initShaderFiles();
  loadShaders();
  
  // FBOs & Textures
  resizeScene();
  mColorPaletteLUT = gl::Texture2d::create( loadImage( app::loadAsset( COLOR_PALETTE_LUT_FILE ) ) );
  mPostProcessingLUT = gl::Texture2d::create( loadImage( app::loadAsset( POST_PROCESSING_LUT_FILE ) ) );
  
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

void CouleursApp::setupMusic()
{
  auto sourceFile = audio::load( loadAsset( MUSIC_FILE ) );
  mMusic = audio::Voice::create( sourceFile );
}

void CouleursApp::setupMidi()
{
  if ( mMidiIn.getNumPorts() > 0 ) {
    mMidiIn.listPorts();
    mMidiIn.openPort( 0 );
    cout << "Opening MIDI port 0" << endl;
    mMidiIn.midiSignal.connect( bind( &CouleursApp::midiListener, this, placeholders::_1 ) );
  }
  else {
    cout << "No MIDI ports found" << endl;
  }
}

void CouleursApp::setupParams()
{
  for ( int i = 0; i < NUM_SECTIONS; i++ ) {
    mParameters.push_back( new Parameter() );
    // Scene
    mConfig( to_string( i ) + ".u_speed",              &mParameters[ i ]->speed );
    mConfig( to_string( i ) + ".u_tickSensitivity",    &mParameters[ i ]->tickSensitivity );
    
    // Feedback
    mConfig( to_string( i ) + ".u_feedbackScale",      &mParameters[ i ]->feedbackScale );
    mConfig( to_string( i ) + ".u_feedbackAmount",     &mParameters[ i ]->feedbackAmount );
    
    // Post-Processing
    mConfig( to_string( i ) + ".u_randomDisplacement", &mParameters[ i ]->randomDisplacement );
    mConfig( to_string( i ) + ".u_lutMix",             &mParameters[ i ]->lutMix );
    mConfig( to_string( i ) + ".u_blurKernelSize",     &mParameters[ i ]->blurKernelSize );
    mConfig( to_string( i ) + ".u_blurRadius",         &mParameters[ i ]->blurRadius );
  }
}

void CouleursApp::midiListener( midi::Message msg )
{
  switch ( msg.status ) {
    case MIDI_NOTE_ON:
      switch ( msg.pitch ) {
        case 72: //D#4
          mSection = 0;
          break;
        case 73: //E4
          mSection = 1;
          break;
        case 74:
          mSection = 2;
          break;
        case 75:
          mSection = 3;
          break;
        case 76:
          mSection = 4;
          break;
      }      
      break;
    case MIDI_NOTE_OFF:
      break;
    case MIDI_START:
      cout << "MIDI START" << endl;
      mTimer.stop();
      mTimer.start();
      break;
    case MIDI_STOP:
      cout << "MIDI STOP" << endl;
      mTimer.stop();
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

void CouleursApp::initShaderFiles() //TODO: replace this by watchdog?
{
  time_t now = time( 0 );
  mShaderFiles.push_back( { getAssetPath( scenePath ), now } );
  mShaderFiles.push_back( { getAssetPath( feedbackPath ), now } );
  for ( int i = 0; i < NUM_POST_PROCESSORS; i++ ) {
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
    for ( int i = 0; i < NUM_POST_PROCESSORS; i++ ) {
      auto path = string( SHADER_FOLDER ) + string( PROJECT_NAME ) + string( POST_PROCESSING_SHADER ) + to_string( i ) + ".frag";
      auto postProcessingFrag = app::loadAsset( path );
      auto shader = gl::GlslProg::create( gl::GlslProg::Format()
                                         .version( 330 )
                                         .vertex( vert )
                                         .fragment( postProcessingFrag )
                                         .define( "LUT_FLIP_Y" ) );
      mPostProcessingShaders.push_back( shader );
    }
  }
  
  catch ( const std::exception &e ) {
    console() << "Shader exception: " << e.what() << std::endl;
  }
}

void CouleursApp::keyDown( KeyEvent event )
{
  if ( event.getCode() == KeyEvent::KEY_s ) {
    CI_LOG_I( "Saving config file" );
    mConfig.save();
  }
  else if ( event.getCode() == KeyEvent::KEY_f ) {
    CI_LOG_I( "Saving screenshot" );
    writeImage( "/Users/johanismael/Desktop/screenshot.png", copyWindowSurface() );
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
  while ( mOSCIn.hasWaitingMessages() ) {
    osc::Message message;
    mOSCIn.getNextMessage( &message );
    string address = message.getAddress();
    float value = message.getArgAsFloat( 0 );
    
    if ( address == "/1/Size" ) {
      mSmooth = value;
    }
  }
}

void CouleursApp::updateUI()
{
  assert( mParameters.size() > mSection );
  auto param = mParameters[ mSection ];
  
  // Draw UI
  {
    ui::ScopedMainMenuBar mainMenu;    
    
    if ( ui::BeginMenu( "Couleurs" ) ) {
      if ( ui::MenuItem( "QUIT" ) ) {
        quit();
      }
      ui::EndMenu();
    }
  }
  
  {
    ui::ScopedWindow win( "Parameters" );
    
    if ( ui::CollapsingHeader( "Scene", ImGuiTreeNodeFlags_DefaultOpen ) ) {
      ui::SliderFloat( "SDF Smooth",          &mSmooth,                   0.f, 1.f );
      ui::SliderFloat( "Speed",               &param->speed,              0.f, 1.f );
      ui::SliderFloat( "Tick Sensitivity",    &param->tickSensitivity,    0.f, 1.f );
    }
    
    if ( ui::CollapsingHeader( "Feedback", ImGuiTreeNodeFlags_DefaultOpen ) ) {
      ui::SliderFloat( "Feedback Scale",      &param->feedbackScale,      0.f, 2.f );
      ui::SliderFloat( "Feedback Amount",     &param->feedbackAmount,     0.f, 1.f );
    }
    
    if ( ui::CollapsingHeader( "Post Processing", ImGuiTreeNodeFlags_DefaultOpen ) ) {
      ui::SliderFloat( "LUT Mix",             &param->lutMix,             0.f, 1.f );
      ui::SliderFloat( "Random Displacement", &param->randomDisplacement, 0.f, .1f );
      ui::SliderFloat( "Grain Amount",        &mGrainAmount,              0.f, .2f );
      ui::SliderInt(   "Blur Kernel Size",    &param->blurKernelSize    , 1,   20 );
      ui::SliderFloat( "Blur Radius",         &param->blurRadius        , 1.f, 30.f );
    }
  }
  
  {
    ui::ScopedWindow win( "Performance" );
    ui::Text( "FPS: %d", (int)getAverageFps() );
  }
  
  {
    ui::ScopedWindow win( "AV Sync" );
    ui::SliderInt( "Section", &mSection, 0, NUM_SECTIONS - 1 );
    ui::SliderInt( "BPM", &mBPM, 20, 200 );
    auto draw = ui::GetWindowDrawList();
    vec2 p = (vec2)ui::GetCursorScreenPos() + vec2( 0.f, 3.f );
    vec2 size( ui::GetContentRegionAvailWidth() * .7f, ui::GetTextLineHeightWithSpacing() );
    auto c = ImColor( .85f, .87f, .92f, .76f );
    draw->AddRectFilled( p, vec2( p.x + size.x * mTick, p.y + size.y ), c );
  }
  
  {
    ui::ScopedWindow win( "Music" );
    if ( ui::SmallButton( "Play" ) ) {
      mMusic->start();
      mTimer.stop();
      mTimer.start();
    }
    
    if ( ui::SmallButton( "Pause" ) ) {
      mMusic->pause();
    }
    
    if ( ui::SmallButton( "Stop" ) ) {
      mMusic->stop();
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
    assert( mParameters.size() > mSection );
    auto param = mParameters[ mSection ];
    
    {
      // Scene
      gl::ScopedFramebuffer scopedFBO( mSceneFbo );
      gl::ScopedGlslProg shader( mSceneShader );
      mSceneShader->uniform( "u_texLUT", 0 );
      mSceneShader->uniform( "u_smooth", mSmooth );
      mSceneShader->uniform( "u_speed", param->speed );
      mSceneShader->uniform( "u_tickSensitivity", param->tickSensitivity );
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
        mFeedbackShader->uniform( "u_feedbackAmount", param->feedbackAmount );
        mFeedbackShader->uniform( "u_feedbackScale", param->feedbackScale );
        bindCommonUniforms( mFeedbackShader );
        gl::drawSolidRect( drawRect );
        mFeedbackFboCount++;
      }
      
      // Post-Processing
      auto input = feedbackFBOOut->getColorTexture();
      for ( int i = 0; i < NUM_POST_PROCESSORS; i++ ) {        
        bool isLastPass = ( i == NUM_POST_PROCESSORS - 1 );
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
        postProcessingShader->uniform( "u_grainAmount", mGrainAmount );
        postProcessingShader->uniform( "u_mixAmount", param->lutMix );
        postProcessingShader->uniform( "u_randomDisplacement", param->randomDisplacement );
        postProcessingShader->uniform( "u_blurKernelSize", param->blurKernelSize );
        postProcessingShader->uniform( "u_blurRadius", param->blurRadius );
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
  shader->uniform( "u_time", (float)getElapsedSeconds() );
  shader->uniform( "u_tick", mTick );
  shader->uniform( "u_section", mSection );
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
