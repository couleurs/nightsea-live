#pragma once

#include "Patch.h"
#include <vector>
#include <string>

class Performance {
    public:
        Performance( std::initializer_list<std::string> initList );
        ~Performance();

        Patch& currentPatch();
        int numPatches() { return mPatches.size(); }
        int currentPatchIndex() { return mCurrentPatchIndex; }
        const std::string& patchNameAtIndex( int index ) { return mPatches[index].name(); }
        bool previous();
        bool next();
        void goToPatch( int index );        

    private:
        std::vector<Patch> mPatches;
        int mCurrentPatchIndex;        
};