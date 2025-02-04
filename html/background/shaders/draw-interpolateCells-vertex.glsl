in vec4 a_curPosition;
in vec2 a_homePosition;
in vec2 a_drawPosition;

out vec4 v_color;

void main() {
    gl_Position = vec4(a_drawPosition.x, a_drawPosition.y, 0, 1);

    float len = length(a_curPosition.xy - a_homePosition) / 2.0;

    v_color = vec4(len * 2.0, len * 4.0, len * 16.0, 1.0);
}
