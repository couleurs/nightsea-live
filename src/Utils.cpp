#include "cinder/gl/gl.h"
#include "cinder/Log.h"

namespace cinder {
  namespace gl {
    void printError(const std::string &method) {
      GLenum errorFlag = getError();
      if ( errorFlag != GL_NO_ERROR ) {
        CI_LOG_E( method << " -- glGetError flag set: " << getErrorString( errorFlag ) );
      }
    }
  }
}