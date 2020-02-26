cmake_minimum_required( VERSION 2.8 FATAL_ERROR )
set( CMAKE_VERBOSE_MAKEFILE ON )

project( Couleurs )
set( APP_NAME "${PROJECT_NAME}App" )

get_filename_component( CINDER_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../../../cinder_master/" ABSOLUTE )
get_filename_component( APP_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../../" ABSOLUTE )

include( "${CINDER_PATH}/proj/cmake/modules/cinderMakeApp.cmake" )

ci_make_app(
	APP_NAME    ${APP_NAME}
	CINDER_PATH ${CINDER_PATH}
	SOURCES     ${APP_PATH}/src/CouleursApp.cpp ${APP_PATH}/src/Parameters.cpp ${APP_PATH}/src/Parameter.cpp ${APP_PATH}/src/MultipassShader.cpp ${APP_PATH}/src/Modulator.cpp ${APP_PATH}/src/Utils.cpp ${APP_PATH}/src/Animation.cpp ${APP_PATH}/src/Performance.cpp ${APP_PATH}/src/Patch.cpp
	INCLUDES    ${APP_PATH}/include ${CINDER_PATH}/blocks/OSC/src/cinder/osc ${CINDER_PATH}/blocks/Cinder-MIDI2/include ${CINDER_PATH}/blocks/Cinder-MIDI2/lib
    BLOCKS      Cinder-ImGui Cinder-MIDI2 OSC Cinder-Syphon
    LIBRARIES   "-framework CoreMIDI"
)

add_custom_command( TARGET ${APP_NAME} POST_BUILD
	COMMAND ${CMAKE_COMMAND} -E copy_directory
	${CINDER_PATH}/blocks/Cinder-Syphon/lib/Syphon.framework
	${CMAKE_BUILD_TYPE}/${APP_NAME}/${APP_NAME}.app/Contents/Frameworks/Syphon.framework
)

set_target_properties( 
    ${APP_NAME} PROPERTIES
    MACOSX_BUNDLE_INFO_PLIST "${CMAKE_CURRENT_SOURCE_DIR}/../../xcode/Info.plist"
)

get_target_property( OUTPUT_DIR ${APP_NAME} RUNTIME_OUTPUT_DIRECTORY )

add_custom_target( run
    COMMAND open ${OUTPUT_DIR}/${APP_NAME}.app
    DEPENDS ${OUTPUT_DIR}/${APP_NAME}.app/Contents/MacOS/${APP_NAME}
    WORKING_DIRECTORY ${CMAKE_PROJECT_DIR}
)

add_custom_target( run_headless
    COMMAND open ${OUTPUT_DIR}/${APP_NAME}.app --args headless
    DEPENDS ${OUTPUT_DIR}/${APP_NAME}.app/Contents/MacOS/${APP_NAME}
    WORKING_DIRECTORY ${CMAKE_PROJECT_DIR}
)

add_custom_target( run_loop_export
    COMMAND open ${OUTPUT_DIR}/${APP_NAME}.app --args loop_export
    DEPENDS ${OUTPUT_DIR}/${APP_NAME}.app/Contents/MacOS/${APP_NAME}
    WORKING_DIRECTORY ${CMAKE_PROJECT_DIR}
)