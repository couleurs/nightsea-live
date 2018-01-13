#pragma once

#define CI_MIN_LOG_LEVEL 0

// Project
#define PROJECT_NAME "ambient"

// Dimensions
#define SCENE_WIDTH 1000 //2560x1440
#define SCENE_HEIGHT 1000
#define UI_WIDTH 600
#define UI_HEIGHT 600
#define WINDOW_PADDING 20

// Shaders
#define SHADER_FOLDER "shaders/projects/"
#define SCENE_SHADER "/scene.frag"
#define FEEDBACK_SHADER "/feedback.frag"
#define POST_PROCESSING_SHADER "/post_processing_"

// Assets
#define COLOR_PALETTE_LUT_FILE "images/shed/lookup_shed_1.png"
#define POST_PROCESSING_LUT_FILE "images/LUTs/lookup_couleurs_bw.png"

// Config
#define PARAMS_FILE "/params.json"

// Recording
#define RECORD false
#define NUM_FRAMES 1000

// OSC
#define OSC_PORT 9001
