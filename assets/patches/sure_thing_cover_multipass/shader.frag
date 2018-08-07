#include "pass0.glsl"
#include "postProcess.glsl"

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_feedbackAmount;

uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;
uniform sampler2D u_buffer2;
uniform sampler2D u_lookup_couleurs_bw;

in vec2  vTexCoord0;
out vec4 oColor;

void main() {
#ifdef BUFFER_0
    oColor = pass0(vTexCoord0, u_resolution, u_time);    
#elif defined( BUFFER_1 )
    vec4 source = texture(u_buffer0, vTexCoord0);
    vec4 feedback = texture(u_buffer2, vTexCoord0);
    oColor = mix(source, feedback, u_feedbackAmount);  
#elif defined( BUFFER_2 )
    oColor = texture(u_buffer1, vTexCoord0);
#else
    oColor = postProcess(u_buffer2, u_lookup_couleurs_bw, vTexCoord0, u_resolution, u_time);        
    // oColor = texture(u_buffer2, vTexCoord0);
#endif
}
