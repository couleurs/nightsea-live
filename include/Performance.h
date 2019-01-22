#pragma once

#include "Patch.h"
#include <vector>
#include <string>

class Performance {
    public:
        Performance( std::initializer_list<std::string> initList );
        ~Performance();

        Patch& currentPatch();
        void previous();
        void next();

    private:
        std::vector<Patch> mPatches;
        int mCurrentPatchIndex;
};