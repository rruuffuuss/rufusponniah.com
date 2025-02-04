in vec4 a_position; //particles are stored in array with previous particle values, so vec4 needed but only use xy

uniform float verticalEnlarge; //particles calculations performed with respect to screen dimensions so must be stretched during draw to fill entire screen

void main() {
    gl_Position = vec4(a_position.x, a_position.y * verticalEnlarge, 0, 1);
      //gl_Position = vec4(0, 0, 0, 1);
    gl_PointSize = 1.0;
}