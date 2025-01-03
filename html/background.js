
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


const colorCache = [];
for (let d2 = 0; d2 <= 765; d2++) {
    const r = Math.min(Math.max(255 - d2 * 4, 0), 255);
    const g = Math.min(Math.max(510 - d2 * 4, 0), 255);
    const b = Math.min(Math.max(765 - d2 * 4, 0), 255);
    colorCache[d2] = `rgb(${r},${g},${b})`;
}

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

      let dX = constraint[0].x - self.x;
      let dY = constraint[0].y - self.y;

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


    if (distance < 50) {
      this.prevX += pushForce * (event.clientX - this.x) / distance;
      this.prevY += pushForce * (event.clientY - this.y) / distance;
    }
  }

  click(event) {

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


// Get the canvas element
var canvas = document.getElementById('backgroundCanvas');

// Set canvas dimensions
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Get the context of the canvas
var ctx = canvas.getContext('2d');

function updateAll(event) {

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  points.forEach(row => row.forEach(point => point.update()));
  for (let i = 0; i < constrainAmount; i++) {
    points.forEach(row => row.forEach(point => point.constrain()));
  }

  points.forEach(row => row.forEach(point => point.draw()));

}

// Draw the background
function setupBackground() {

  ctx.fillStyle = "white";

  points = Point.generate_point_array(Math.floor(columnNumber * (window.innerWidth / initialWindowWidth)), Math.floor(rowNumber * (window.innerHeight / initialWindowHeight)), ctx);

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



