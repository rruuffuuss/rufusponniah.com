function main() {

    // Vertex shader (same as above)
    const vsSource = `#version 300 es
in vec4 a_position;
void main() {
    gl_Position = vec4(a_position.xy, 0, 1);
    gl_PointSize = 10.0; // Make points visible
}`;

    // Fragment shader (same as above)
    const fsSource = `#version 300 es
precision mediump float;
out vec4 fragColor;
void main() {
    fragColor = vec4(1, 0, 0.5, 1); // Redish-purple
}`;

    const canvas = document.querySelector("#canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const gl = canvas.getContext("webgl2");

    if (!gl) {
        console.error("WebGL 2.0 not supported.");
        return;
    }

    // Compile shaders and link program
    const program = webglUtils.createProgramFromSources(gl, [vsSource, fsSource]);
    gl.useProgram(program);

    // Define points
    const points = new Float32Array([
        -0.5, -0.5, 0.0, 1.0,
        0.5, -0.5, 0.0, 1.0,
        0.0, 0.5, 0.0, 1.0,
    ]);

    // Set up buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);

    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 4, gl.FLOAT, false, 0, 0);

    // Set viewport and clear canvas
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw points
    gl.drawArrays(gl.POINTS, 0, 3);

}

main();