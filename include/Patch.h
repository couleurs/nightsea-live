#pragma once

#include "Parameters.h"
#include <string>

class Patch {
    public:
        Patch( std::string name );
        ~Patch();

        Parameters& params();
        const std::string& name() { return mName; };
        const ci::fs::path& path() { return mFolderPath; };
        const ci::fs::path& shaderPath() { return mShaderPath; };

    private:
        std::string   mName;
        ci::fs::path  mFolderPath, mShaderPath;
        Parameters    mParams;
};