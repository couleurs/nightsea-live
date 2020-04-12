#include "MultipassShader.h"
#include "cinder/Utilities.h"
#include <regex>
#include "Utils.h"

using namespace ci;
using namespace std;

static fs::path vertPath = "shaders/vertex/passthrough.vert";

MultipassShader::MultipassShader() {}
MultipassShader::~MultipassShader() {}

void MultipassShader::init( int width, int height, const std::function<void ( gl::GlslProgRef )> &setUniforms, bool loopMode ) 
{
    mLoopMode = loopMode;
    mSetUniforms = setUniforms;    
    mFinalShader = gl::GlslProg::create( gl::GlslProg::Format().version( 330 )
                                                               .vertex( app::loadAsset( vertPath ) )
                                                               .fragment( app::loadAsset( "shaders/vertex/passthrough.frag" ) ) );
    resize( width, height );
}

void MultipassShader::resize( int width, int height ) 
{
    mWidth = width;
    mHeight = height;
    mMainFbo = gl::Fbo::create( width, height );
    for (unsigned int i = 0; i < mFbos.size(); i++) {
        mFbos[i] = gl::Fbo::create( width, height );
    }
}

const std::string fragFilename = "/shader.frag";
void MultipassShader::load( const fs::path &path ) 
{
    fs::path fragPath = path.string() + fragFilename;
    auto format = gl::GlslProg::Format().version( 330 )
                                        .vertex( app::loadAsset( vertPath ) )
                                        .fragment( app::loadAsset( fragPath ) );   
    if ( mLoopMode ) {
        format = format.define( "LOOP" );
    }     

    try {
        mPatchPath = path;
        mMainShader = gl::GlslProg::create( format );
        mFragPath = fragPath;
        mMainFragSource = format.getFragment();        
        mShaderCompilationFailed = false;

        mFbos.clear();
        mShaders.clear();
        updateBuffers();        
    }

    catch ( const std::exception &e ) {
        shaderError( e.what() );
    }

    loadTextures();
}

void MultipassShader::reload() 
{
    auto format = gl::GlslProg::Format().version( 330 )
                                        .vertex( app::loadAsset( vertPath ) )
                                        .fragment( app::loadAsset( mFragPath ) );
    if ( mLoopMode ) {
        format = format.define( "LOOP" );
    }    
 
    try {
        mMainShader = gl::GlslProg::create( format );
        mMainFragSource = format.getFragment(); 
        mShaderCompilationFailed = false;   
        updateBuffers();
    }

    catch ( const std::exception &e ) {
        shaderError( e.what() );
    }

    loadTextures();
}

void MultipassShader::draw( const Rectf &r, const gl::Texture2dRef &syphonTexture ) 
{
    // Intermediary passes
    for (unsigned int i = 0; i < mFbos.size(); i++) {
        drawShaderInFBO( r, mShaders[i], mFbos[i], syphonTexture, i );
    }

    // Final pass
    drawShaderInFBO( r, mMainShader, mMainFbo, syphonTexture, -1 );

    // Draw on screen
    {
        gl::ScopedGlslProg scopedShader( mFinalShader );
        gl::ScopedTextureBind scopedTexture( mMainFbo->getColorTexture(), 0 );
        mFinalShader->uniform( "u_tex", 0 );
        gl::drawSolidRect( r );
    }
}

void MultipassShader::shaderError(const char *msg) 
{    
    mShaderCompilationFailed = true;
    mShaderCompileErrorMessage = std::string( msg );
}

/* Privates */

void MultipassShader::loadTextures() 
{
  vector<fs::path> imageNames;  

  // Iterate through project directory to detect images
  for ( auto &p: boost::filesystem::directory_iterator( app::getAssetPath( mPatchPath ) ) ) {
    auto extension = p.path().extension();
    if ( extension == ".jpg" || extension == ".png" ) {
      imageNames.push_back( p.path().filename() );
    }
  }    

  // Create textures
  mTextures.clear();
  for ( int i = 0; i < imageNames.size(); i++ ) {
    auto assetPath = mPatchPath / imageNames[i];
    auto nameWithoutExtension = imageNames[i].replace_extension( "" );
    gl::Texture::Format textureFormat;        
    mTextures[ nameWithoutExtension.string() ] = gl::Texture2d::create( loadImage( app::loadAsset( assetPath ) ), textureFormat );
  }
}

void MultipassShader::drawShaderInFBO( const Rectf &r, const gl::GlslProgRef &shader, const gl::FboRef &fbo, const gl::TextureRef &syphonTexture, int index ) 
{
    if ( fbo != nullptr ) {
        fbo->bindFramebuffer();        
    }
    gl::ScopedGlslProg scopedShader( shader );
            
    // Bind textures from other buffers
    int textureIndex = 1;
    for (unsigned int j = 0; j < mFbos.size(); j++) {
        if (j != index) {
            mFbos[j]->getColorTexture()->bind( textureIndex );            
            shader->uniform( "u_buffer" + std::to_string( j ), textureIndex );                
            textureIndex++;
        }
    }

    // Set non-texture uniforms
    mSetUniforms( shader ); 

    // Set texture uniforms
    for ( auto it = mTextures.begin(); it != mTextures.end(); it++ ) {    
        it->second->bind( textureIndex );
        shader->uniform( "u_" + it->first, textureIndex );
        textureIndex++;
    }  

    // Set Syphon texture
    syphonTexture->bind( textureIndex );
    shader->uniform( "u_syphonTex", textureIndex );

    // Draw
    gl::drawSolidRect( r );    
    gl::printError( "drawSolidRect" );

    // Unbind FBOs & textures
    for (unsigned int j = 0; j < mFbos.size(); j++) {
        if (j != index) {
            mFbos[j]->getColorTexture()->unbind();            
        }
    }
    
    for ( auto it = mTextures.begin(); it != mTextures.end(); it++ ) {    
        it->second->unbind();    
    }

    syphonTexture->unbind();

    if ( fbo != nullptr ) {
        fbo->unbindFramebuffer();        
    }     
}

void MultipassShader::updateBuffers() 
{
    int bufferCount = getBufferCount();
    
    if ( bufferCount != mFbos.size() ) {
        mFbos.clear();
        mShaders.clear();

        for (int i = 0; i < bufferCount; i++) {
            // New FBO
            auto fbo = gl::Fbo::create( mWidth, mHeight );
            mFbos.push_back( fbo );

            // New SHADER
            auto format = gl::GlslProg::Format().version( 330 )
                                                .vertex( app::loadAsset( vertPath ) )
                                                .fragment( app::loadAsset( mFragPath ) )
                                                .define( "BUFFER_" + std::to_string( i ) );
            if ( mLoopMode ) {
                format = format.define( "LOOP" );
            }

            auto shader = gl::GlslProg::create( format );
            mShaders.push_back( shader );
        }
    }
    else {
        for (unsigned int i = 0; i < mShaders.size(); i++) {
            auto format = gl::GlslProg::Format().version( 330 )
                                                .vertex( app::loadAsset( vertPath ) )
                                                .fragment( app::loadAsset( mFragPath ) )
                                                .define( "BUFFER_" + std::to_string( i ) );
            if ( mLoopMode ) {
                format = format.define( "LOOP" );
            }

            mShaders[i] = gl::GlslProg::create( format );
        }
    }

    gl::printError( "updateBuffers" );
}

int MultipassShader::getBufferCount() 
{
    std::vector<std::string> lines = split(mMainFragSource, '\n');
    std::vector<std::string> results;

    std::regex re(R"((?:^\s*#if|^\s*#elif)(?:\s+)(defined\s*\(\s*BUFFER_)(\d+)(?:\s*\))|(?:^\s*#ifdef\s+BUFFER_)(\d+))");
    std::smatch match;

    for (int l = 0; l < lines.size(); l++) {
        if (std::regex_search(lines[l], match, re)) {
            std::string number = std::ssub_match(match[2]).str();
            if (number.size() == 0) {
                number = std::ssub_match(match[3]).str();
            }

            bool already = false;
            for (int i = 0; i < results.size(); i++) {
                if (results[i] == number) {
                    already = true;
                    break;
                }
            }

            if (!already) {
                results.push_back(number);
            }
        }
    }

    return results.size();
}
