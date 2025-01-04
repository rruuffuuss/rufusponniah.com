/*
make the points into a texture which is an array of vec 4 out of pairs of [oldcoords, newcoords] vec2



points texture

output texture <- ends up being points texture
*/
"use strict";


function main() {

    let originPointCoords = new Float32Array(pointsNumber * 2);

    //array of format [point1x, point1y, point1xPrevious, point1yPrevious, point2x ....]
    //format necessary for GPGPU compute where points is treated as an RGBA texture
    //let points = new Float32Array(pointsNumber * 4);

    let points = new Float32Array([
        1.0, 1.0, 3.0, 3.0,
        0.0, 0.0, 0.0, 0.0,
        1.0, 1.0, 2.0, 2.0,
        4.0, 4.0, 3.0, 3.0,
        1.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0,
        1.0, 1.0, 2.0, 2.0,
        4.0, 4.0, 3.0, 3.0,
        4.0, 4.0, 3.0, 3.0
    ])

    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    var canvas = document.querySelector("#canvas");
    // Set canvas dimensions
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var gl = canvas.getContext("webgl2");
    if (!gl) {
        console.error("WebGL 2.0 not supported.");
        return;
    }


    const floatColorBuffer = gl.getExtension('EXT_color_buffer_float');
    if (!floatColorBuffer) {
        console.error("EXT_color_buffer_float not supported. Can't use FLOAT textures for rendering.");
        return;
    }

    var update = webglUtils.createProgramFromScripts(gl, ["update-vertex", "update-fragment"]);
    gl.useProgram(update);

    let textureWidth = 3;
    let textureHeight = 3;

    //#################################################
    //###CREATING AND BINDING FRAMEBUFFER FOR OUTPUT###
    //#################################################

    // Create a framebuffer
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    // Create an output texture
    const outputzTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, outputTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        textureWidth, //columnNumber,
        textureHeight, //rowNumber,
        0,
        gl.RGBA,
        gl.FLOAT,
        null
    );

    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);   

    // Attach the output texture to the framebuffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.error("Framebuffer is incomplete. Status: " + status);
    }

    //#########################################
    //###CREATING AND BINDING POINTS TEXTURE###
    //#########################################

    var pointsTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, pointsTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
        gl.TEXTURE_2D,      // Target
        0,                  // Mipmap level
        gl.RGBA32F,         // Internal format 
        textureWidth, //columnNumber,       // Width
        textureHeight, //rowNumber,      // Height
        0,                  // Border (must be 0)
        gl.RGBA,            // Format of the data
        gl.FLOAT,           // Data type
        points           // Data array
    );

    const textureUniform = gl.getUniformLocation(update, "points");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pointsTexture);
    gl.uniform1i(textureUniform, 0);

    //###################################################
    //###CREATING AND BINDING DRAG AND SCREEN UNIFORMS###
    //###################################################

    // Get the uniform locations
    const dragUniformLocation = gl.getUniformLocation(update, "drag");
    const screenUniformLocation = gl.getUniformLocation(update, "screen");

    gl.uniform1f(dragUniformLocation, drag);

    gl.uniform2f(screenUniformLocation, 4, 4);//window.innerWidth, window.innerHeight);

    //#############################
    //###RENDER FULL SCREEN QUAD###
    //#############################

    // Define quad vertices (NDC: normalized device coordinates)
    const quadVertices = new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        1, 1
    ]);

    // Upload the quad vertices to the GPU
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    // Bind and draw the quad
    // Get the location of the position attribute in the shader
    const positionAttribLocation = gl.getAttribLocation(update, "aPosition");
    gl.enableVertexAttribArray(positionAttribLocation);
    //gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);

    //set viewport size
    gl.viewport(0, 0, textureWidth, textureHeight);

    // Draw the quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    //###########################
    //###READ BACK THE TEXTURE###
    //###########################

    gl.readPixels(0, 0, textureWidth, textureHeight, gl.RGBA, gl.FLOAT, points);
    console.log(outputData);

    function update() {


        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        //###########################
        //###READ BACK THE TEXTURE###
        //###########################

        gl.readPixels(0, 0, textureWidth, textureHeight, gl.RGBA, gl.FLOAT, points);
    }
}

var urlParams = window.location.search;
var urlParamsValid = true;

var initialWindowWidth = window.innerWidth;
var initialWindowHeight = window.innerHeight;

if (urlParams.includes('?')) {
    var getQuery = urlParams.split('?')[1];

    let params = new URLSearchParams(getQuery);

    try {

        var constrainAmount = Number(params.get('constrainAmount'));
        var constrainForce = Number(params.get('constrainForce'));

        var pushForce = Number(params.get('pushForce'));
        var pushRadius = Number(params.get('pushRadius'));

        var clickForce = Number(params.get('clickForce')); ''
        var clickRadius = Number(params.get('clickRadius'));

        var drag = Number(params.get('viscosity'));

        var columnNumber = Number(params.get('columns'));
        var rowNumber = Number(params.get('rows'));
        var pointsNumber = columnNumber * rowNumber;

    }
    catch (err) {
        urlParamsValid = false;
    }
}
if (!urlParams.includes('?') || !urlParamsValid) {
    const urlParams = new URLSearchParams(window.location.search);

    urlParams.set('change_these_numbers', 'if_you_want');
    urlParams.set('constrainAmount', '1');
    urlParams.set('constrainForce', '0.1');
    urlParams.set('pushForce', '0.4');
    urlParams.set('pushRadius', '50');
    urlParams.set('clickForce', '100');
    urlParams.set('clickRadius', '500');
    urlParams.set('viscosity', '0.99');
    urlParams.set('columns', Math.floor(window.innerWidth / 16));
    urlParams.set('rows', Math.floor(window.innerHeight / 16));

    window.location.search = urlParams;

}

main();