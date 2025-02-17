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
    var pingpong = false;

    let mouseTimer;
    let mousePush = false;
    let mousePushForce = 0;
    let mousePushRadius = 0;
    let mouseCoords = [0, 0];


    /*
    var points = new Float32Array([
        0.2, 0.2, 0.6, 0.6,
        0.0, 0.0, 0.0, 0.0,
        0.2, 0.2, 0.4, 0.4,
        0.8, 0.8, 0.6, 0.6,
        0.2, 0.2, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0,
        0.2, 0.2, 0.4, 0.4,
        0.8, 0.8, 0.6, 0.6,
        0.8, 0.8, 0.6, 0.6
    ]);*/

    var points = generatePoints();
    const homePoints = generateCells(points);
    const cellDisplay = generateDrawCells();

    //console.log(points);
    //console.log(homePoints);
    //console.log(cellDisplay);

    console.log('x sep: ' + String(points[4] - points[0]));
    console.log('y sep: ' + String(points[columnNumber * 4 + 1] - points[1]));
    //console.log('y sep: ' + String(points[columnNumber * 8 + 1] - points[columnNumber * 4 + 1]));

    console.log(columnNumber);
    console.log(rowNumber);

    // Setup update graphics library
    /** @type {HTMLCanvasElement} */
    var dummy = document.querySelector("#dummy");
    var textureWidth = columnNumber;
    var textureHeight = rowNumber;
    var gl = dummy.getContext("webgl2");

    const pong = gl.createTexture();
    const ping = gl.createTexture();

    var textureUniform;

    var mousePushUniformLocation;
    var pushForceUniformLocation;
    var pushRadiusUniformLocation;
    var mouseCoordUniformLocation;

    var textureDisplacementUniformLocation;
    var particleDisplacementUniformLocation;
    var constrainForceUniformLocation;
    var constrainRepeatsUniformLocation;

    updateSetup();


    // Setup draw graphics library
    /** @type {HTMLCanvasElement} */
    var canvas = document.querySelector("#canvas");
    // Set canvas dimensions
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var dr = canvas.getContext("webgl2");
    console.log(mode);
    if (mode != 'cellMode') {
        console.log('mode is cellmode');
        var positionBuffer;
        var yEnlargeUniformLocation;

        drawSetup();

        var draw = function(){drawParticles();};
    } else {
        console.log('mode not cellmode');
        var currentPositionBuffer;
        var homePositionBuffer;
        var drawPositionBuffer;
        var sizeUniform;
        cellSetup();

        var draw = function(){drawCells();};
    }

    

    var pointsAnimation = setInterval(function () {
        for (let i = 0; i < simulationSpeed; i++) {
            updateParticles();
        }
        draw();
    }, 10);

    


    function cellSetup() {
        if (!dr) {
            console.error("WebGL 2.0 not supported.");
            return;
        }

        const drawProgram = webglUtils.createProgramFromScripts(dr, ["vertex-draw-cells", "fragment-draw-cells"]);
        dr.useProgram(drawProgram);


        //webglUtils.resizeCanvasToDisplaySize(dr.canvas);

        currentPositionBuffer = dr.createBuffer();
        dr.bindBuffer(dr.ARRAY_BUFFER, currentPositionBuffer);
        const currentPositionAttributeLocation = dr.getAttribLocation(drawProgram, "a_curPosition");
        dr.enableVertexAttribArray(currentPositionAttributeLocation);
        dr.vertexAttribPointer(currentPositionAttributeLocation, 4, dr.FLOAT, false, 0, 0);

        homePositionBuffer = dr.createBuffer();
        dr.bindBuffer(dr.ARRAY_BUFFER, homePositionBuffer);
        const homePositionAttributeLocation = dr.getAttribLocation(drawProgram, "a_homePosition");
        dr.enableVertexAttribArray(homePositionAttributeLocation);
        dr.vertexAttribPointer(homePositionAttributeLocation, 2, dr.FLOAT, false, 0, 0);
        dr.bufferData(dr.ARRAY_BUFFER, homePoints, dr.STATIC_DRAW)

        drawPositionBuffer = dr.createBuffer();
        dr.bindBuffer(dr.ARRAY_BUFFER, drawPositionBuffer);
        const drawPositionAttributeLocation = dr.getAttribLocation(drawProgram, "a_drawPosition");
        dr.enableVertexAttribArray(drawPositionAttributeLocation);
        dr.vertexAttribPointer(drawPositionAttributeLocation, 2, dr.FLOAT, false, 0, 0);
        dr.bufferData(dr.ARRAY_BUFFER, cellDisplay, dr.STATIC_DRAW)
        
        
        sizeUniform = dr.getUniformLocation(drawProgram, "u_size");
        dr.uniform1f(sizeUniform, 1.01 * window.innerWidth / textureWidth);
    }

    function drawCells() {

        dr.bindBuffer(dr.ARRAY_BUFFER, currentPositionBuffer); 
        dr.bufferData(dr.ARRAY_BUFFER, points, dr.DYNAMIC_DRAW)

        dr.viewport(0, 0, canvas.width, canvas.height);
        dr.clearColor(0, 0, 0, 0);
        dr.clear(dr.COLOR_BUFFER_BIT);

        dr.drawArrays(dr.POINTS, 0, textureHeight * textureWidth);
        /*
        // Update the buffer with the latest points data
        dr.bindBuffer(dr.ARRAY_BUFFER, positionBuffer); // Ensure the correct buffer is bound
        dr.bufferSubData(dr.ARRAY_BUFFER, 0, points);   // Update only the buffer's data

        // Clear the canvas
        dr.clearColor(0, 0, 0, 0);
        dr.clear(dr.COLOR_BUFFER_BIT);

        dr.drawArrays(dr.TRIANGLES, 0, textureHeight * textureWidth);
        */
    }


    function drawSetup() {
        if (!dr) {
            console.error("WebGL 2.0 not supported.");
            return;
        }

        const drawProgram = webglUtils.createProgramFromScripts(dr, ["vertex-draw-particles", "fragment-draw-particles"]);
        dr.useProgram(drawProgram);


        //webglUtils.resizeCanvasToDisplaySize(dr.canvas);

        positionBuffer = dr.createBuffer();
        dr.bindBuffer(dr.ARRAY_BUFFER, positionBuffer);
        //dr.bufferData(dr.ARRAY_BUFFER, points, dr.STATIC_DRAW);

        // look up where the vertex data needs to go.
        const positionAttributeLocation = dr.getAttribLocation(drawProgram, "a_position");
        dr.enableVertexAttribArray(positionAttributeLocation);

        dr.vertexAttribPointer(positionAttributeLocation, 4, dr.FLOAT, false, 0, 0);
        // Allocate initial memory for the buffer without setting data yet
        //dr.bufferData(dr.ARRAY_BUFFER, points.length * Float32Array.BYTES_PER_ELEMENT, dr.DYNAMIC_DRAW);

        yEnlargeUniformLocation = dr.getUniformLocation(drawProgram, "verticalEnlarge");
        dr.uniform1f(yEnlargeUniformLocation, window.innerWidth / window.innerHeight);
    }

    function drawParticles() {

        dr.bindBuffer(dr.ARRAY_BUFFER, positionBuffer);
        dr.bufferData(dr.ARRAY_BUFFER, points, dr.DYNAMIC_DRAW)

        dr.viewport(0, 0, canvas.width, canvas.height);
        dr.clearColor(0, 0, 0, 0);
        dr.clear(dr.COLOR_BUFFER_BIT);

        dr.drawArrays(dr.POINTS, 0, textureHeight * textureWidth);
        /*
        // Update the buffer with the latest points data
        dr.bindBuffer(dr.ARRAY_BUFFER, positionBuffer); // Ensure the correct buffer is bound
        dr.bufferSubData(dr.ARRAY_BUFFER, 0, points);   // Update only the buffer's data

        // Clear the canvas
        dr.clearColor(0, 0, 0, 0);
        dr.clear(dr.COLOR_BUFFER_BIT);

        dr.drawArrays(dr.TRIANGLES, 0, textureHeight * textureWidth);
        */
    }



    function updateSetup() {
        if (!gl) {
            console.error("WebGL 2.0 not supported.");
            return;
        }


        const floatColorBuffer = gl.getExtension('EXT_color_buffer_float');
        if (!floatColorBuffer) {
            console.error("EXT_color_buffer_float not supported. Can't use FLOAT textures for rendering.");
            return;
        }

        var updateProgram = webglUtils.createProgramFromScripts(gl, ["update-vertex", "update-fragment"]);
        gl.useProgram(updateProgram);

        //#######################################
        //###CREATING TEXTURES AND FRAMEBUFFER###
        //#######################################

        // Create a framebuffer
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        // Create 2 textures for pingponging. 
        // No need to set texture wrapping params as coordinates will alwas be 0 <= ord <= 1
        // set near for minimisation and magnification, to use closest texel rather than linear interpolation
        // I don't tink minimisation or magnification will actually ever happen
        gl.bindTexture(gl.TEXTURE_2D, pong);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);


        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA32F,
            textureWidth, //columnNumber,
            textureHeight, //rowNumber,
            0,
            gl.RGBA,
            gl.FLOAT,
            points
        );

        gl.bindTexture(gl.TEXTURE_2D, ping);
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

        //create uniform for texture
        textureUniform = gl.getUniformLocation(updateProgram, "points");
        gl.activeTexture(gl.TEXTURE0);

        //###################################################
        //###CREATING AND BINDING DRAG AND SCREEN UNIFORMS###
        //###################################################

        // Get the uniform locations
        const dragUniformLocation = gl.getUniformLocation(updateProgram, "drag");
        const screenUniformLocation = gl.getUniformLocation(updateProgram, "screenRatio");

        mousePushUniformLocation = gl.getUniformLocation(updateProgram, "mousePush");
        pushForceUniformLocation = gl.getUniformLocation(updateProgram, "pushForce");
        pushRadiusUniformLocation = gl.getUniformLocation(updateProgram, "pushRadius");
        mouseCoordUniformLocation = gl.getUniformLocation(updateProgram, "mouseCoord");

        textureDisplacementUniformLocation = gl.getUniformLocation(updateProgram, "textureDisplacement");
        particleDisplacementUniformLocation = gl.getUniformLocation(updateProgram, "particleDisplacement");
        constrainForceUniformLocation = gl.getUniformLocation(updateProgram, "constrainForce");
        constrainRepeatsUniformLocation = gl.getUniformLocation(updateProgram, "constrainRepeats");



        gl.uniform1f(dragUniformLocation, drag);
        gl.uniform1f(screenUniformLocation, window.innerHeight / window.innerWidth);

        //set initial values in mouse uniforms 
        gl.uniform1i(mousePushUniformLocation, mousePush);
        gl.uniform1f(pushForceUniformLocation, mousePushForce);
        gl.uniform1f(pushRadiusUniformLocation, mousePushRadius);
        gl.uniform2f(mouseCoordUniformLocation, mouseCoords[0], mouseCoords[1]);

        gl.uniform4f(textureDisplacementUniformLocation, 1 / columnNumber, 1 / rowNumber, 1 - 1 / columnNumber, 1 - 1 / rowNumber);
        gl.uniform2f(particleDisplacementUniformLocation, points[4] - points[0], points[columnNumber * 4 + 1] - points[1]); //same as xStep and yStep in point generation
        gl.uniform1f(constrainForceUniformLocation, constrainForce);
        gl.uniform1i(constrainRepeatsUniformLocation, constrainAmount);


        // Define quad vertices (NDC: normalized device coordinates)
        const quadVertices = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            1, 1
        ]);

        // Upload the quad vertices to the GPU
        const quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

        // Bind and draw the quad
        // Get the location of the position attribute in the shader
        const positionAttribLocation = gl.getAttribLocation(updateProgram, "aPosition");
        gl.enableVertexAttribArray(positionAttribLocation);
        //gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);

        //set viewport size
        gl.viewport(0, 0, textureWidth, textureHeight);

    }

    function updateParticles() {

        //bind ping or pong depending on pingpong
        if (pingpong) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ping, 0);// ping is output
            gl.bindTexture(gl.TEXTURE_2D, pong);// pong is input
        } else {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pong, 0);// pong is output
            gl.bindTexture(gl.TEXTURE_2D, ping);// ping is input
        }
        pingpong = !pingpong;

        //put the bound texture in the texture uniform
        gl.uniform1i(textureUniform, 0);

        //put mouse information into uniforms
        gl.uniform1i(mousePushUniformLocation, mousePush);

        //only set other uniforms if mouse is currently pushing
        if (mousePush) {
            gl.uniform1f(pushForceUniformLocation, mousePushForce);
            gl.uniform1f(pushRadiusUniformLocation, mousePushRadius);
            gl.uniform2f(mouseCoordUniformLocation, mouseCoords[0], mouseCoords[1]);
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        //###########################
        //###READ BACK THE TEXTURE###
        //###########################

        gl.readPixels(0, 0, textureWidth, textureHeight, gl.RGBA, gl.FLOAT, points);
    }

    function generatePoints() {
        let xStep = 2 / (columnNumber - 1);
        let yStep = 2 * (window.innerHeight / window.innerWidth) / (rowNumber - 1);
        let yOffset = (window.innerHeight / window.innerWidth);

        let points = new Float32Array(4 * columnNumber * rowNumber);
        for (let y = 0; y <= rowNumber; y++) {
            for (let x = 0; x <= columnNumber; x++) {
                let cur = 4 * (y * columnNumber + x);
                points[cur] = xStep * x - 1;
                points[cur + 1] = yStep * y - yOffset;
                points[cur + 2] = xStep * x - 1; //+ 0.01 * x / columnNumber;//+0.03 for initial movement -1 to center in clipspace
                points[cur + 3] = yStep * y - yOffset;// + 0.01 * x / columnNumber;
            }
        }
        return points;
    }

    function generateCells(points) {

        let cells = new Float32Array(points.length / 2);

        for (let i = 0; i < points.length; i += 4) {
            cells[i / 2] = points[i];
            cells[(i / 2) + 1] = points[i + 1];
        }

        return cells

        /*
        let xStep = 2 / (columnNumber - 1);
        let yStep = 2 / (rowNumber - 1);

        cells = new Array(points.length * 2 - rowNumber);

        for (let y = 0; y <= rowNumber - 1; y++) {
            for (let x = 0; x <= columnNumber; x++) {
                cells[2 * (y + x)] = points[y + x];
                cells[2 * (y + x) + 1] = points[y + columnNumber + x];
            }
        }*/
    }

    function generateDrawCells(points){
        let xStep = 2 / (columnNumber - 1);
        let yStep = 2 / (rowNumber - 1);

        let cells = new Float32Array(2 * columnNumber * rowNumber)

        for (let y = 0; y <= rowNumber; y++) {
            for (let x = 0; x <= columnNumber; x++) {
                let cur = 2 * (y * columnNumber + x); 
                cells[cur] = xStep * x - 1;
                cells[cur + 1] = yStep * y - 1;
            }
        }

        return cells;
    }


    function move (event) {
        clearTimeout(mouseTimer);
        mousePush = true;
        mousePushForce = pushForce;
        mousePushRadius = pushRadius;
        mouseCoords = [(2 * event.clientX / window.innerWidth) - 1, ((-2 * event.clientY / window.innerHeight) + 1) * window.innerHeight / window.innerWidth]; //mult y by inverse ratio to compensate for stretch in vertex shader
        mouseTimer = setTimeout(() => {
            if (mousePushForce < clickForce) {
                mousePush = false;
            }
        }, 100);
        //console.log(mousePushForce);
    }


    function click (event) {
        //updateParticles();
        //drawParticles();

        clearTimeout(mouseTimer);
        mousePush = true;
        mousePushForce = clickForce;
        mousePushRadius = clickRadius;
        mouseCoords = [(2 * event.clientX / window.innerWidth) - 1, ((-2 * event.clientY / window.innerHeight) + 1) * window.innerHeight / window.innerWidth]; //mult y by inverse ratio to compensate for stretch in vertex shader
        mouseTimer = setTimeout(() => {
            mousePush = false;
        }, 100);
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mousedown", click);
    document.addEventListener("touchmove", move);
    document.addEventListener("touchend", click);
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

        var simulationSpeed = Number(params.get('simulationSpeed'));

        var mode = params.get('mode');
    }
    catch (err) {
        urlParamsValid = false;
    }
}
if (!urlParams.includes('?') || !urlParamsValid) {
    const urlParams = new URLSearchParams(window.location.search);

    urlParams.set('change_these_numbers', 'if_you_want');
    urlParams.set('constrainAmount', '1');
    urlParams.set('constrainForce', '0.0017');
    urlParams.set('pushForce', '0.00005');
    urlParams.set('pushRadius', '0.1');
    urlParams.set('clickForce', '0.05');
    urlParams.set('clickRadius', '0.2');
    urlParams.set('viscosity', '0.993');
    urlParams.set('columns', Math.floor(window.innerWidth / 8));
    urlParams.set('rows', Math.floor(window.innerHeight / 8));

    urlParams.set('simulationSpeed', '10');

    urlParams.set('mode', 'cellMode')

    window.location.search = urlParams;

}

window.addEventListener('resize', function () {
    
    main();
});

main();