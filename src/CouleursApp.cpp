// Cinder
#include "cinder/app/App.h"
#include "cinder/app/RendererGl.h"
#include "cinder/gl/gl.h"
#include "cinder/Log.h"
#include "cinder/Timer.h"
#include "cinder/audio/Voice.h"
#include "cinder/CinderMath.h"

// Blocks
#include "Osc.h"
#include "CinderImGui.h"
#include "MidiIn.h"
#include "MidiMessage.h"
#include "MidiConstants.h"

// C
#include <ctime>
//#include <stdlib.h>

// Couleurs
#include "Parameters.hpp"
#include "Constants.h"
#include "MultipassShader.h"

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
  void mouseMove( MouseEvent event ) override;
  
private:
  void initShaderWatching();
  
  // Setup
  void setupUI();
  void setupScene();
  void setupMidi();
  
  // Update
  void updateOSC();
  void updateUI();
  void updateShaders();
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
    
  std::vector<File>            mShaderFiles;
  bool                         mSceneIsSetup = false;
  
  // Time
  float                        mTime = 0;
  bool                         mTimeStopped = false;
  
  // Mouse
  ivec2                        mMousePosition;

  // AV Sync
  ci::Timer                    mTimer;
  int                          mBPM = 107;
  float                        mTick; //[0 - 1]
  int                          mSection = 0;  

  MultipassShader              mMultipassShader;
  
  // Window Management
  ci::app::WindowRef       mUIWindow, mSceneWindow;
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

static fs::path fragPath = string( SHADER_FOLDER ) + string( PROJECT_NAME ) + string( "/example_1.frag" );

void CouleursApp::setup()
{
  setupUI();
  setupScene();
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
  initShaderWatching();
  mMultipassShader.allocate( mSceneWindow->getWidth(), mSceneWindow->getHeight() );  
  mMultipassShader.load( fragPath,
                        [&] (gl::GlslProgRef shader) { bindCommonUniforms( shader ); },
                        [] () { return; } );
  
  // GL State
  gl::disableDepthRead();
  gl::disableDepthWrite();
  
  mSceneIsSetup = true;
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

void CouleursApp::resizeScene() {
  auto w = mSceneWindow->getWidth();
  auto h = mSceneWindow->getHeight();  
  mMultipassShader.allocate( w, h );
}

void CouleursApp::initShaderWatching() {
  time_t now = time( 0 );
  mShaderFiles.push_back( { getAssetPath( fragPath ), now } );
}

void CouleursApp::mouseMove( MouseEvent event )
{
    mMousePosition = glm::clamp(event.getPos(), ivec2( 0., 0. ), mSceneWindow->getSize() );
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
    if ( mMultipassShader.mShaderCompilationFailed ) {
      ui::ScopedStyleColor color( ImGuiCol_TitleBgActive, ImVec4( .9f, .1f, .1f, .85f ) );
      ui::ScopedWindow win( "Debug" );      
      ui::Text( "%s", mMultipassShader.mShaderCompileErrorMessage.c_str() );
      console() << "Shader exception: " << mMultipassShader.mShaderCompileErrorMessage << std::endl;      
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
  
  if ( shadersNeedReload ) {
    mMultipassShader.reload();
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
  mMultipassShader.draw();
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
  shader->uniform( "u_mouse", (vec2)mMousePosition );
    
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
  // settings->setHighDensityDisplayEnabled();
})
