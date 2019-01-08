#pragma once

#include "Parameters.h"
#include <string>

class Patch {
    public:
        Patch( std::string name );
        ~Patch();

        Parameters& params();

    private:
        std::string mName;
        Parameters  mParams;
};