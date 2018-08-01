cmake_minimum_required( VERSION 2.8 FATAL_ERROR )
set( CMAKE_VERBOSE_MAKEFILE ON )

project( opengl-ObjLoader )

get_filename_component( CINDER_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../../../cinder_master/" ABSOLUTE )
get_filename_component( APP_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../../" ABSOLUTE )

include( "${CINDER_PATH}/proj/cmake/modules/cinderMakeApp.cmake" )

ci_make_app(
	APP_NAME    "Couleurs"
	CINDER_PATH ${CINDER_PATH}
	SOURCES     ${APP_PATH}/src/CouleursApp.cpp ${APP_PATH}/src/Config.cpp ${APP_PATH}/src/Parameters.cpp
	INCLUDES    ${APP_PATH}/include ${CINDER_PATH}/blocks/OSC/src/cinder/osc ${CINDER_PATH}/blocks/Cinder-MIDI2/include ${CINDER_PATH}/blocks/Cinder-MIDI2/lib
    BLOCKS      Cinder-ImGui Cinder-MIDI2 OSC
)
