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
    if (mode == 'particle') {
        console.log('mode is cellmode');
        var positionBuffer;
        var yEnlargeUniformLocation;

        drawSetup();

        var draw = function () { drawParticles(); };
    } else if (mode == 'cellBlock' || mode == 'cellInterpolate') {
        console.log('mode not cellmode');
        var currentPositionBuffer;
        var homePositionBuffer;
        var drawPositionBuffer;

        if (mode == 'cellBlock') {
            var sizeUniform;
            blockCellSetup();
            var draw = function () { drawBlockCells(); };
        } else if (mode == 'cellInterpolate') {
            var indices = [];
            interpolateCellSetup();
            var draw = function () { drawInterpolateCells(); };
        }


    }



    pointsAnimation = setInterval(function () {

        for (let i = 0; i < simulationSpeed; i++) {
            updateParticles();
        }
        draw();
    }, 10);


    function cellSetup(drawProgram) {


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

    }

    function blockCellSetup() {
        if (!dr) {
            console.error("WebGL 2.0 not supported.");
            return;
        }

        const drawProgram = webglUtils.createProgramFromScripts(dr, ["vertex-draw-cells", "fragment-draw-cells"]);
        dr.useProgram(drawProgram);


        cellSetup(drawProgram);

        sizeUniform = dr.getUniformLocation(drawProgram, "u_size");
        dr.uniform1f(sizeUniform, 1.04 * Math.max(window.innerWidth / textureWidth, window.innerHeight / textureHeight));
    }

    function drawBlockCells() {

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


    function interpolateCellSetup() {
        if (!dr) {
            console.error("WebGL 2.0 not supported.");
            return;
        }

        const drawProgram = webglUtils.createProgramFromScripts(dr, ["vertex-draw-interpolateCells", "fragment-draw-interpolateCells"]);
        dr.useProgram(drawProgram);


        cellSetup(drawProgram);

        //setup indeces
        for (let y = 0; y < rowNumber - 1; y++) {
            for (let x = 0; x < columnNumber; x++) {
                const top = y * columnNumber + x;
                const bottom = (y + 1) * columnNumber + x;

                indices.push(top, bottom);
            }

            // Add a degenerate triangle to move to the next row
            if (y < rowNumber - 2) {
                indices.push((y + 1) * columnNumber + (columnNumber - 1), (y + 1) * columnNumber);
            }
        }

        console.log(indices);
        console.log(points.length);

        const indexBuffer = dr.createBuffer();
        dr.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        dr.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    }

    function drawInterpolateCells() {

        dr.bindBuffer(dr.ARRAY_BUFFER, currentPositionBuffer);
        dr.bufferData(dr.ARRAY_BUFFER, points, dr.DYNAMIC_DRAW)

        dr.viewport(0, 0, canvas.width, canvas.height);
        dr.clearColor(0, 0, 0, 0);
        dr.clear(dr.COLOR_BUFFER_BIT);

        dr.drawElements(dr.TRIANGLE_STRIP, indices.length, gl.UNSIGNED_SHORT, 0);
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

    function generateDrawCells(points) {
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

    function move(event) {
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


    function click(event) {
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

    urlParams.set('columns', Math.floor(window.innerWidth / 12));
    urlParams.set('rows', Math.floor(window.innerHeight / 12));
    urlParams.set('constrainAmount', '1');
    urlParams.set('constrainForce', '0.0017');
    urlParams.set('pushForce', '0.00005');
    urlParams.set('pushRadius', '0.1');
    urlParams.set('clickForce', '0.05');
    urlParams.set('clickRadius', '0.2');
    urlParams.set('viscosity', '0.993');

    urlParams.set('simulationSpeed', '10');

    urlParams.set('mode', 'cellInterpolate')

    window.location.search = urlParams;

}


/*stolen https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser*/


/*
window.mobileAndTabletCheck = function() {
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
  };

if(window.mobileAndTabletCheck) {
    window.addEventListener('resize', function () {
        const url = new URL(window.location);
        url.search = ''; // Clear all search parameters
        window.location.href = url;
    });
}*/
var resizeTimeout;
var pointsAnimation;


/*function reset() {
    clearInterval(pointsAnimation);

    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        initialWindowWidth = window.innerWidth;
        initialWindowHeight = window.innerHeight;
        main();
    }, 300);
}*/



//window.addEventListener('resize', reset());

main();