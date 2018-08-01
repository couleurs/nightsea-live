cmake_minimum_required( VERSION 2.8 FATAL_ERROR )
set( CMAKE_VERBOSE_MAKEFILE ON )

project( Couleurs )
set( APP_NAME "${PROJECT_NAME}App" )

# set( CMAKE_BUILD_TYPE "Release" )
set( CMAKE_BUILD_TYPE "Debug" )

get_filename_component( CINDER_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../../../cinder_master/" ABSOLUTE )
get_filename_component( APP_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../../" ABSOLUTE )

include( "${CINDER_PATH}/proj/cmake/modules/cinderMakeApp.cmake" )

ci_make_app(
	APP_NAME    ${APP_NAME}
	CINDER_PATH ${CINDER_PATH}
	SOURCES     ${APP_PATH}/src/CouleursApp.cpp ${APP_PATH}/src/Config.cpp ${APP_PATH}/src/Parameters.cpp
	INCLUDES    ${APP_PATH}/include ${CINDER_PATH}/blocks/OSC/src/cinder/osc ${CINDER_PATH}/blocks/Cinder-MIDI2/include ${CINDER_PATH}/blocks/Cinder-MIDI2/lib
    BLOCKS      Cinder-ImGui Cinder-MIDI2 OSC
)

add_custom_target( run
    COMMAND open ${CMAKE_BUILD_TYPE}/${APP_NAME}/${APP_NAME}.app
    DEPENDS ${CMAKE_BUILD_TYPE}/${APP_NAME}/${APP_NAME}.app/Contents/MacOS/${APP_NAME}
    WORKING_DIRECTORY ${CMAKE_PROJECT_DIR}
)