#include "MultipassShader.h"
#include "cinder/Utilities.h"
#include <regex>

using namespace ci;

static fs::path vertPath = "shaders/vertex/passthrough.vert";

MultipassShader::MultipassShader() {}
MultipassShader::~MultipassShader() {}

void MultipassShader::allocate( int width, int height ) {
    mWidth = width;
    mHeight = height;
    mMainFbo = gl::Fbo::create( width, height );
    mFinalShader = gl::GlslProg::create( gl::GlslProg::Format().version( 330 )
                                                               .vertex( app::loadAsset( vertPath ) )
                                                               .fragment( app::loadAsset( "shaders/vertex/passthrough.frag" ) ) );
    for (unsigned int i = 0; i < mFbos.size(); i++) {
        mFbos[i] = gl::Fbo::create( width, height );
    }
}

void MultipassShader::load( const fs::path &fragPath, const std::function<void ( gl::GlslProgRef, int )> &setUniforms, const std::function<void ()> &cleanUp ) {
    auto format = gl::GlslProg::Format().version( 330 )
                                        .vertex( app::loadAsset( vertPath ) )
                                        .fragment( app::loadAsset( fragPath) );        
    try {
        mMainShader = gl::GlslProg::create( format );
        mFragPath = fragPath;
        mMainFragSource = format.getFragment();
        mSetUniforms = setUniforms;
        mCleanUp = cleanUp;
        mShaderCompilationFailed = false;

        mFbos.clear();
        mShaders.clear();
        updateBuffers();        
    }

    catch ( const std::exception &e ) {
        shaderError( e.what() );
    }
}

void MultipassShader::shaderError(const char *msg) {
    // console() << "Shader exception: " << msg << std::endl;
    mShaderCompilationFailed = true;
    mShaderCompileErrorMessage = std::string( msg );
}

void MultipassShader::reload() {
    auto format = gl::GlslProg::Format().version( 330 )
                                        .vertex( app::loadAsset( vertPath ) )
                                        .fragment( app::loadAsset( mFragPath) );    
    try {
        mMainShader = gl::GlslProg::create( format );
        mMainFragSource = format.getFragment(); 
        mShaderCompilationFailed = false;   
        updateBuffers();
    }

    catch ( const std::exception &e ) {
        shaderError( e.what() );
    }
}

void MultipassShader::draw( const Rectf &r ) {
    // Intermediary passes
    for (unsigned int i = 0; i < mFbos.size(); i++) {
        drawShaderInFBO( r, mShaders[i], mFbos[i], i );
    }

    // Final pass
    drawShaderInFBO( r, mMainShader, mMainFbo, -1 );

    // Draw on screen
    {
        gl::ScopedGlslProg scopedShader( mFinalShader );
        gl::ScopedTextureBind scopedTexture( mMainFbo->getColorTexture(), 0 );
        mFinalShader->uniform( "u_tex", 0 );
        gl::drawSolidRect( r );
    }
}

void MultipassShader::drawShaderInFBO( const Rectf &r, const gl::GlslProgRef &shader, const gl::FboRef &fbo, int index ) {
    if ( fbo != nullptr ) {
        fbo->bindFramebuffer();
    }
    gl::ScopedGlslProg scopedShader( shader );
            
    // Bind textures from other buffers
    int textureIndex = 1;
    for (unsigned int j = 0; j < mFbos.size(); j++) {
        if (index != j) {
            mFbos[j]->getColorTexture()->bind( textureIndex );
            shader->uniform( "u_buffer" + std::to_string( j ), textureIndex );                
            textureIndex++;
        }
    }

    // Set uniforms, including external textures
    mSetUniforms( shader, textureIndex );

    // Draw
    gl::drawSolidRect( r );

    // Unbind textures & FBO
    for (unsigned int j = 0; j < mFbos.size(); j++) {
        if (index != j) {
            mFbos[j]->getColorTexture()->unbind();
        }
    }
    mCleanUp();
    if ( fbo != nullptr ) {
        fbo->unbindFramebuffer();
    }
}

void MultipassShader::updateBuffers() {
    int bufferCount = getBufferCount();
    
    if ( bufferCount != mFbos.size() ) {
        mFbos.clear();
        mShaders.clear();

        for (int i = 0; i < bufferCount; i++) {
            // New FBO
            auto fbo = gl::Fbo::create( mWidth, mHeight );
            mFbos.push_back( fbo );

            // New SHADER
            auto shader = gl::GlslProg::create( gl::GlslProg::Format().version( 330 )
                                                                      .vertex( app::loadAsset( vertPath ) )
                                                                      .fragment( app::loadAsset( mFragPath ) )
                                                                      .define( "BUFFER_" + std::to_string( i ) ) );
            mShaders.push_back( shader );
        }

    }
    else {
        for (unsigned int i = 0; i < mShaders.size(); i++) {
            mShaders[i] = gl::GlslProg::create( gl::GlslProg::Format().version( 330 )
                                                                                .vertex( app::loadAsset( vertPath ) )
                                                                                .fragment( app::loadAsset( mFragPath ) )
                                                                                .define( "BUFFER_" + std::to_string( i ) ) );
        }
    }
}

int MultipassShader::getBufferCount() {
    std::vector<std::string> lines = split(mMainFragSource, '\n');
    std::vector<std::string> results;

    std::regex re(R"((?:^\s*#if|^\s*#elif)(?:\s+)(defined\s*\(\s*BUFFER_)(\d+)(?:\s*\))|(?:^\s*#ifdef\s+BUFFER_)(\d+))");
    std::smatch match;

    for (int l = 0; l < lines.size(); l++) {
        if (std::regex_search(lines[l], match, re)) {

            // for (int i = 0; i < match.size(); i++) {
            //     cout << i << " -> " << std::ssub_match(match[i]).str() << endl;
            // }

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
