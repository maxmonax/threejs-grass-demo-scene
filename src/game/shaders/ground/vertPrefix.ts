export const groundVertexPrefix = `
    uniform sampler2D noiseTexture;
    float getYPosition(vec2 p) {
        return 8.0 * (2.0 * texture2D(noiseTexture, p/800.0).r - 1.0);
    }

    attribute vec3 basePosition;
    uniform float delta;
    uniform float posX;
    uniform float posZ;
    uniform float radius;
    uniform float width;

    float placeOnSphere(vec3 v) {
        float theta = acos(v.z/radius);
        float phi = acos(v.x/(radius * sin(theta)));
        float sV = radius * sin(theta) * sin(phi);
        //If undefined, set to default value
        if(sV != sV) {
            sV = v.y;
        }
        return sV;
    }

    //Get the position of the ground from the [x,z] coordinates, the sphere and the noise height field
    vec3 getPosition(vec3 pos, float epsX, float epsZ){
    vec3 temp;
    temp.x = pos.x + epsX;
    temp.z = pos.z + epsZ;
    temp.y = max(0.0, placeOnSphere(temp)) - radius;
    temp.y += getYPosition(vec2(basePosition.x+epsX+delta*floor(posX), basePosition.z+epsZ+delta*floor(posZ)));
    return temp;
    }

    //Find the normal at pos as the cross product of the central-differences in x and z directions
    vec3 getNormal(vec3 pos) {
        float eps = 1e-1;

        vec3 tempP = getPosition(pos, eps, 0.0);
        vec3 tempN = getPosition(pos, -eps, 0.0);
        
        vec3 slopeX = tempP - tempN;

        tempP = getPosition(pos, 0.0, eps);
        tempN = getPosition(pos, 0.0, -eps);

        vec3 slopeZ = tempP - tempN;

        vec3 norm = normalize(cross(slopeZ, slopeX));
        return norm;
    }
`;