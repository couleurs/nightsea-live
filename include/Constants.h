#pragma once

#define CI_MIN_LOG_LEVEL 0

// Project
#define PROJECT_NAME "multipass"

// Dimensions
#define SCENE_WIDTH 600 //2560x1440
#define SCENE_HEIGHT 600
#define UI_WIDTH 600
#define UI_HEIGHT 600
#define WINDOW_PADDING 20

// Shaders
#define SHADER_FOLDER "shaders/projects/"
#define SCENE_SHADER "/scene.frag"
#define FEEDBACK_SHADER "/feedback.frag"
#define POST_PROCESSING_SHADER "/post_processing_"

// Assets
#define INPUT_TEXTURE "images/inputs/archilect_1.png"
#define COLOR_PALETTE_LUT "images/LUTs/lookup_shed_2.png"
#define POST_PROCESSING_LUT "images/LUTs/lookup_couleurs_bw.png"

// Config
#define PARAMS_FILE "/params.json"

// Recording
#define RECORD false
#define NUM_FRAMES 1000

// OSC
#define OSC_PORT 9001

// MIDI
#define MIDI_CONTROLLER_PORT 2
