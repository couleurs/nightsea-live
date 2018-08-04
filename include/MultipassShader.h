#pragma once

#include "cinder/app/App.h"
#include "cinder/gl/gl.h"

using namespace ci;

class MultipassShader {
    public:
        MultipassShader();
        ~MultipassShader();
        void allocate( int width, int height );
        void load( const fs::path &fragPath, const std::function<void ( gl::GlslProgRef, int )> &setUniforms, const std::function<void ()> &cleanUp );
        void reload();
        void draw( const Rectf &r );

        bool                     mShaderCompilationFailed = false;
        std::string              mShaderCompileErrorMessage;

    private:
        int getBufferCount();
        void updateBuffers();
        void drawShaderInFBO( const Rectf &r, const gl::GlslProgRef &shader, const gl::FboRef &fbo, int index );
        void shaderError( const char *msg );

        std::function<void ( gl::GlslProgRef, int )> mSetUniforms;
        std::function<void () > mCleanUp;
        std::vector<gl::FboRef> mFbos;
        std::vector<gl::Texture2dRef> mTextures; 
        std::vector<gl::GlslProgRef> mShaders;
        gl::GlslProgRef mMainShader;
        gl::FboRef mMainFbo;
        std::string mMainFragSource;
        fs::path mFragPath;
        int mWidth, mHeight;
};

