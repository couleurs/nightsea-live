#pragma once

#include "cinder/app/App.h"
#include "cinder/gl/gl.h"

using namespace ci;

class MultipassShader {
    public:
        MultipassShader();
        ~MultipassShader();
        void allocate( int width, int height );
        void load( const DataSourceRef &fragDataSource, std::function<void ( gl::GlslProgRef )> &setUniforms, std::function<void ()> &cleanUp );
        void draw();

    private:
        int getBufferCount();
        void updateBuffers();
        void drawShaderInFBO( const gl::GlslProgRef &shader, const gl::FboRef &fbo, int index );

        std::function<void ( gl::GlslProgRef )> mSetUniforms;
        std::function<void () > mCleanUp;
        std::vector<gl::FboRef> mFbos;
        std::vector<gl::Texture2dRef> mTextures; 
        std::vector<gl::GlslProgRef> mShaders;
        gl::GlslProgRef mMainShader;
        gl::FboRef mMainFbo;
        std::string mMainFragSource;
        int mWidth, mHeight;
};

