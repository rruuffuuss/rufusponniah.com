precision mediump float;

in vec2 vTexCoord;

uniform sampler2D points;
uniform float drag;
uniform float screenRatio;
uniform bool mousePush;
uniform float pushForce;
uniform float pushRadius;
uniform vec2 mouseCoord;
uniform int constrainRepeats;

    //textureDisplacement.z = 1 -textureDisplacement.x, textureDisplacement.w = 1 -textureDisplacement.y
uniform vec4 textureDisplacement; // used to get adjacent texels from texture and set fixed points on edges

uniform vec2 particleDisplacement; // starting distance between particles, used to calculate constraints
uniform float constrainForce;

out vec4 fragColor;

void constrain(vec2 attachedParticle, float displacementLoc) {
    vec2 d = attachedParticle - fragColor.xy;
    float d2 = sqrt(length(d));
    float push = constrainForce * ((d2 - displacementLoc) / d2);
    if(push > 0.0)
        fragColor.zw -= push * d;
}

void main() {
    vec4 point = texture(points, vTexCoord);

      //push, update & constrain the particle if it is not on an edge particle
    if(vTexCoord.x > textureDisplacement.x + textureDisplacement.x && vTexCoord.x < textureDisplacement.z - textureDisplacement.x && vTexCoord.y > textureDisplacement.y && vTexCoord.y < textureDisplacement.w) {

        //push particles with the mouse
        if(mousePush) {
            float d = distance(mouseCoord, point.xy);
            if(d < pushRadius) {
                point.zw += pushForce * (mouseCoord - point.xy) / d;
            }
        }

        //update the position of the particle
        fragColor.zw = point.xy;
        //new position += displacement from old position * drag
        point.xy = point.xy + (point.xy - point.zw) * drag;

        //if a point is outside the bounds of the screen, swap new and old (reverse velocity) 
        if(point.x > 1.0 || point.x < -1.0) {
            fragColor.x = fragColor.z;
            fragColor.z = point.x;
        } else {
            fragColor.x = point.x;
        }
        if(point.y > screenRatio || point.y < -screenRatio) {
            fragColor.y = fragColor.w;
            fragColor.w = point.y;
        } else {
            fragColor.y = point.y;
        }

        for(int i = 0; i < constrainRepeats; i++) {
            constrain(texture(points, vTexCoord + vec2(textureDisplacement.x, 0)).xy, particleDisplacement.x);
            constrain(texture(points, vTexCoord - vec2(textureDisplacement.x, 0)).xy, particleDisplacement.x);
            constrain(texture(points, vTexCoord + vec2(0, textureDisplacement.y)).xy, particleDisplacement.y);
            constrain(texture(points, vTexCoord - vec2(0, textureDisplacement.y)).xy, particleDisplacement.y);
        }

        /*
        constrain(texture(points, vTexCoord + textureDisplacement.xy).xy, vec2(1, 1));
        constrain(texture(points, vTexCoord - textureDisplacement.xy).xy, vec2(-1, -1));
        constrain(texture(points, vTexCoord + textureDisplacement.xy * vec2(-1, 1)).xy, vec2(-1, 1));
        constrain(texture(points, vTexCoord + textureDisplacement.xy * vec2(1, -1)).xy, vec2(1, -1));
        
  
        
        // find the mean displacement of attached particles
        vec2 displacementSum = (
        texture(points, vTexCoord + textureDisplacement.x).xy
        + texture(points, vTexCoord + textureDisplacement.y).xy
        + texture(points, vTexCoord - textureDisplacement.x).xy
        + texture(points, vTexCoord - textureDisplacement.y).xy
        ) / 4.0 - fragColor.xy;
        
        // move previous position away from displacement to apply a force against it
        fragColor.zw -= displacementSum * constrainForce;
        */
    } else {
        fragColor = point;
    }
}