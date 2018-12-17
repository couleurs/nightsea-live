#pragma once

#define PATCH_NAME "displacement_radial_2"

// Recording
#define RECORD 0
#define NUM_FRAMES 300 // 10 sec, 30fps

// Dimensions
#define SCENE_WIDTH 960 //2560x1440
#define SCENE_HEIGHT 960
#define UI_WIDTH 700
#define UI_HEIGHT 700
#define WINDOW_PADDING 15

// Patches
#define PATCHES_FOLDER "patches/"
#define MAIN_SHADER_FILE "/shader.frag"
#define PARAMS_FILE "/params.json"  

// OSC
#define OSC_PORT 9001

// MIDI
#define MIDI_CONTROLLER_PORT 2

// Log
#define CI_MIN_LOG_LEVEL 0