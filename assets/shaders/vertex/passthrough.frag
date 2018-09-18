in vec2  vTexCoord0;
out vec4 oColor;

uniform sampler2D u_tex;

void main() {
    oColor = texture(u_tex, vTexCoord0);
}