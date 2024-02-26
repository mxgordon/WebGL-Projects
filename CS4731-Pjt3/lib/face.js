/**
 * A face used in our model. Faces will have three or more vertices.
 */
class Face {

    faceVertices = [];  // The vertices of our face
    faceNormals = [];   // The normals of our face
    faceTexCoords = []; // The texture coordinates of our face (NaN if they don't exist)

    material = null;    // The material used for this face

    constructor(faceVertices, faceNormals, faceTexCoords, material) {

        // Construct the face using fan triangulation
        for (let i = 1; i < faceVertices.length - 1; i++) {
            this.faceVertices.push(
                this.getFloatVec(faceVertices[0]),
                this.getFloatVec(faceVertices[i]),
                this.getFloatVec(faceVertices[i + 1])
            );
            if(faceNormals.length > 0) {
                this.faceNormals.push(
                    this.getFloatVec(faceNormals[0]),
                    this.getFloatVec(faceNormals[i]),
                    this.getFloatVec(faceNormals[i + 1])
                );
            }
            if(faceTexCoords.length > 0) {
                this.faceTexCoords.push(
                    this.getFloatVec(faceTexCoords[0]),
                    this.getFloatVec(faceTexCoords[i]),
                    this.getFloatVec(faceTexCoords[i + 1])
                );
            }
        }

        this.material = material;
    }

    /**
     * Converts a vector of string objects to a vector
     * of floating point values.
     *
     * @param vec   The vector to convert.
     * @returns {*} The converted vector.
     */
    getFloatVec(vec) {
        let i = vec.length;
        if(i === 2) {
            return vec2(
                parseFloat(vec[0]),
                parseFloat(vec[1])
            );
        }
        else if(i === 3) {
            return vec3(
                parseFloat(vec[0]),
                parseFloat(vec[1]),
                parseFloat(vec[2])
            );
        }
        else if(i === 4) {
            return vec4(
                parseFloat(vec[0]),
                parseFloat(vec[1]),
                parseFloat(vec[2]),
                parseFloat(vec[3])
            );
        }
        else {
            return vec4(0.0, 0.0, 0.0, 1.0);
        }
    }
}