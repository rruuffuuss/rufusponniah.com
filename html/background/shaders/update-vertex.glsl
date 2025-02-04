    // Vertex position input
in vec2 aPosition;

    // Output texture coordinates to the fragment shader
out vec2 vTexCoord;

void main() {
    vTexCoord = aPosition;

        // Set the final position of the vertex in clip space
    gl_Position = vec4((aPosition * 2.0) - 1.0, 0.0, 1.0);
}