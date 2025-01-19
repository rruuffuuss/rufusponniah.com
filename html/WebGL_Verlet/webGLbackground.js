/*
PLAN

vertex shader 1:
updates points
finds forces between points
*/


"use strict";
class Point {
  constructor(x, y, ctx, connectedPoints) {

    this.x = x - 1;
    this.prevX = this.x;

    this.y = y - 1;
    this.prevY = this.y;

    this.originX = this.x;
    this.originY = this.y;

    this.drawX = this.x - pointSquareWidth / 2;
    this.drawY = this.y - pointSquareHeight / 2;

    this.ctx = ctx;
    this.constraints = this.calculateConstraints(connectedPoints);
  }

  calculateConstraints(connectedPoints) {
    let constraints = [];

    for (let i = 0; i < connectedPoints.length; i++) {
      constraints.push([connectedPoints[i], this.distance(this.x, this.y, connectedPoints[i].x, connectedPoints[i].y)]);
    }

    return constraints;
  }
  //generate an array of width by height points within the window
  static generate_point_array(width, height, ctx) {

    let xStep = window.innerWidth / width;
    let yStep = window.innerHeight / height;

    let points = [];
    for (let y = 0; y <= height; y++) {
      let row = [];
      for (let x = 0; x <= width; x++) {
        if (y === 0 /*|| x === 0*/) {
          row.push(new fixedPoint(xStep * x, yStep * y, ctx, null));
        }
        else if (x === 0) {
          row.push(new fixedPoint(xStep * x, yStep * y, ctx, [points[y - 1][x]]));
        }
        else if (y === height || x === width) {
          row.push(new fixedPoint(xStep * x, yStep * y, ctx, [points[y - 1][x], row[x - 1]]));
        } else { row.push(new Point(xStep * x, yStep * y, ctx, [points[y - 1][x], row[x - 1]])); }
      }

      points.push(row);
    }

    return (points);
  }

  clamp = (val, min, max) => Math.min(Math.max(val, min), max)

  draw() {

    let d2 = Math.floor(Math.abs(this.x - this.originX) + Math.abs(this.y - this.originY));
    this.ctx.fillStyle = colorCache[d2];
    console.log(d2);
    this.ctx.fillRect(this.drawX, this.drawY, pointSquareWidth, pointSquareHeight);

    /*
    this.ctx.fillStyle = "white";

    this.ctx.fillRect(this.X, this.Y, pointSquareWidth, pointSquareHeight);

    
    for(let i = 0; i < this.constraints.length; i++){
      this.ctx.beginPath();
      this.ctx.moveTo(this.x, this.y);
      this.ctx.lineTo(this.constraints[i][0].x, this.constraints[i][0].y);
      this.ctx.stroke();
    }

     */
  }

  //
  update() {
    let tempX = this.x;
    let tempY = this.y;

    this.x += (tempX - this.prevX) * drag;
    this.y += (tempY - this.prevY) * drag;




    if (this.x > window.innerWidth || this.x < 0) {
      this.prevX = this.x;
      this.x = tempX;
    } else { this.prevX = tempX; }

    if (this.y > window.innerHeight || this.y < 0) {
      this.prevY = this.y;
      this.y = tempY;
    } else { this.prevY = tempY; }

  }

  constrain() {

    var self = this;
    this.constraints.forEach(function (constraint) {

      let dX = constraint[0].y - self.x;
      let dY = constraint[0].y - self.x;

      let d2 = Math.sqrt(dX * dX + dY * dY);

      if (true) {
        let diff = d2 - constraint[1];

        let push = constrainForce * (diff / d2) / 2;

        let pushX = push * dX;
        let pushY = push * dY;
        self.prevX -= pushX;
        self.prevY -= pushY;
        constraint[0].push(pushX, pushY);
      }
    });
  }

  mousePush(event, pushForce, pushRadius) {
    let distance = this.distance(this.x, this.y, event.clientX, event.clientY)


    if (distance < pushRadius) {
      this.prevX += pushForce * (event.clientX - this.x) / distance;
      this.prevY += pushForce * (event.clientY - this.y) / distance;
    }
  }

  push(x, y) {
    this.prevX += x;
    this.prevY += y;
  }

  distance(x1, y1, x2, y2) {
    const X = x2 - x1;
    const Y = y2 - y1;
    return Math.sqrt(X * X + Y * Y);
  }
}

class fixedPoint extends Point {
  constructor(x, y, ctx, connectedPoints) {
    super(x, y, ctx, connectedPoints);
  }

  calculateConstraints(connectedPoints) {
    if (connectedPoints != null) {
      return super.calculateConstraints(connectedPoints);
    }
    return [];
  }

  update() { }
  mousePush() { }
  draw() { }

}


function main() {

  function updateAll(event) {

    //create arrays for point positions (2 * length for x and y)
    let positions = new Array((points.length * points[0].length) * 2);
    let oldPositions = new Array((points.length * points[0].length) * 2);

    for(let i = 0; i < points.length; i++){
      for(let y = 0; y < points[0].length; y++){
        points[i][y].constrain();

        positions[i * points]
      }
    }

    points.forEach(row => row.forEach(point => point.update()));
    for (let i = 0; i < constrainAmount; i++) {
      points.forEach(row => row.forEach(point => point.constrain()));
    }



    //points.forEach(row => row.forEach(point => point.draw()));

    // Fill buffers with data
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, oldPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(oldPositions), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, originBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(origins), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, clipSpaceOriginBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(clipSpaceOrigins), gl.STATIC_DRAW);

    // Set up vertex attributes
    const aPositionLocation = gl.getAttribLocation(program, "a_position");
    const aOldPositionLocation = gl.getAttribLocation(program, "a_oldPosition");
    const aOriginLocation = gl.getAttribLocation(program, "a_origin");
    const aClipSpaceOriginLocation = gl.getAttribLocation(program, "a_clipSpaceOrigin");

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPositionLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, oldPositionBuffer);
    gl.vertexAttribPointer(aOldPositionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aOldPositionLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, originBuffer);
    gl.vertexAttribPointer(aOriginLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aOriginLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, clipSpaceOriginBuffer);
    gl.vertexAttribPointer(aClipSpaceOriginLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aClipSpaceOriginLocation);

    // Set uniforms
    const dragLocation = gl.getUniformLocation(program, "drag");
    const screenLocation = gl.getUniformLocation(program, "screen");
    const sizeLocation = gl.getUniformLocation(program, "size");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");

    gl.uniform1f(dragLocation, 0.9); // Example drag value
    gl.uniform2f(screenLocation, canvas.width, canvas.height); // Screen size
    gl.uniform2f(sizeLocation, 100, 100); // Example size value
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height); // Resolution

    // Draw
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, positions.length / 2);
  }

  // Draw the background
  function setupBackground() {


    points = Point.generate_point_array(Math.floor(columnNumber * (window.innerWidth / initialWindowWidth)), Math.floor(rowNumber * (window.innerHeight / initialWindowHeight)), gl);

    pointSquareWidth = window.innerWidth / Math.floor(columnNumber * (window.innerWidth / initialWindowWidth)) + 1;
    pointSquareHeight = window.innerHeight / Math.floor(rowNumber * (window.innerHeight / initialWindowHeight)) + 1;

    pointsAnimation = setInterval(function () { updateAll(points) }, 10);
  }
  // Call the drawBackground function
  setupBackground();

  console.log("loaded");

  // Redraw the background when the window is resized
  window.addEventListener('resize', function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    clearInterval(pointsAnimation);
    setupBackground(pointsAnimation);
  });

  document.addEventListener("mousemove", function (event) {
    points.forEach(row => row.forEach(point => point.mousePush(event, pushForce, pushRadius)));
  });


  document.addEventListener("mousedown", function (event) {
    points.forEach(row => row.forEach(point => point.mousePush(event, clickForce, clickForce)));
  });

  var pointsAnimation;
  var points;

  var pointSquareWidth;
  var pointSquareHeight;

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

  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.querySelector("#canvas");
  // Set canvas dimensions
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  // setup GLSL program
  var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader-2d", "fragment-shader-2d"]);

  // look up where the vertex data needs to go.
  var positionAttributeLocation = gl.getAttribLocation(program, "a_position");

  // look up uniform locations
  var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
  var colorUniformLocation = gl.getUniformLocation(program, "u_color");

  // Create a buffer to put three 2d clip space points in
  // Create buffers
  var positionBuffer = gl.createBuffer();
  var oldPositionBuffer = gl.createBuffer();
  var originBuffer = gl.createBuffer();
  var clipSpaceOriginBuffer = gl.createBuffer();

  webglUtils.resizeCanvasToDisplaySize(gl.canvas);

  // Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Tell it to use our program (pair of shaders)
  gl.useProgram(program);

  // Turn on the attribute
  gl.enableVertexAttribArray(positionAttributeLocation);

  // Bind the position buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
    positionAttributeLocation, size, type, normalize, stride, offset);

  // set the resolution
  gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

  // draw 50 random rectangles in random colors
  for (var ii = 0; ii < 50; ++ii) {
    // Setup a random rectangle
    // This will write to positionBuffer because
    // its the last thing we bound on the ARRAY_BUFFER
    // bind point
    setRectangle(
      gl, randomInt(300), randomInt(300), randomInt(300), randomInt(300));

    // Set a random color.
    gl.uniform4f(colorUniformLocation, Math.random(), Math.random(), Math.random(), 1);

    // Draw the rectangle.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);
  }
}

// Returns a random integer from 0 to range - 1.
function randomInt(range) {
  return Math.floor(Math.random() * range);
}

// Fill the buffer with the values that define a rectangle.
function setRectangle(gl, x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    x1, y1,
    x2, y1,
    x1, y2,
    x1, y2,
    x2, y1,
    x2, y2,
  ]), gl.STATIC_DRAW);
}

main();
