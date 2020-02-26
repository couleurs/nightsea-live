#pragma once

#include "cinder/app/App.h"
#include "cinder/gl/gl.h"

using namespace ci;

class MultipassShader {
    public:
        MultipassShader();
        ~MultipassShader();
        void init( int width, int height, const std::function<void ( gl::GlslProgRef )> &setUniforms, bool loopMode );
        void resize( int width, int height );
        void load( const fs::path &fragPath );
        void reload();
        void draw( const Rectf &r );

        bool                     mShaderCompilationFailed = false;
        std::string              mShaderCompileErrorMessage;
        gl::FboRef               mMainFbo;

    private:
        int getBufferCount();
        void updateBuffers();
        void loadTextures();
        void drawShaderInFBO( const Rectf &r, const gl::GlslProgRef &shader, const gl::FboRef &fbo, int index );
        void shaderError( const char *msg );

        std::function<void ( gl::GlslProgRef )> mSetUniforms;        
        std::map<std::string, gl::Texture2dRef> mTextures;
        std::vector<gl::FboRef> mFbos;         
        std::vector<gl::GlslProgRef> mShaders;
        gl::GlslProgRef mMainShader, mFinalShader;        
        std::string mMainFragSource;
        fs::path mPatchPath, mFragPath;
        int mWidth, mHeight;
        bool mLoopMode;
};

