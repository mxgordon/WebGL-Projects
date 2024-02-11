let canvas;
let gl;
let program;

let projectionMat; 
let cameraMat;
let modelMat = scalem(1, 1, 1);

let points = [];
let colors = [];
let indices = [];

let trackPoints = [];
let trackColors = [];


function makeCube(center, radius) {
    let [cx, cy, cz] = center;

    let points = [
        vec4(cx-radius, cy-radius, cz+radius, 1), // Vertex 0
        vec4(cx-radius, cy+radius, cz+radius, 1), // Vertex 1
        vec4(cx+radius, cy+radius, cz+radius, 1), // Vertex 2
        vec4(cx+radius, cy-radius, cz+radius, 1), // Vertex 3
        vec4(cx-radius, cy-radius, cz-radius, 1), // Vertex 4
        vec4(cx-radius, cy+radius, cz-radius, 1), // Vertex 5
        vec4(cx+radius, cy+radius, cz-radius, 1), // Vertex 6
        vec4(cx+radius, cy-radius, cz-radius, 1)  // Vertex 7
    ];

    // Define faces using indices into the vertices array
    let indices = [
        0, 1, 2,   0, 2, 3, // Front face
        4, 5, 6,   4, 6, 7, // Back face
        1, 5, 6,   1, 6, 2, // Top face
        0, 4, 7,   0, 7, 3, // Bottom face
        0, 1, 5,   0, 5, 4, // Left face
        3, 2, 6,   3, 6, 7  // Right face
    ];

    return [points, indices];
}

function makeTrack() {
    let trackPoints = [
        vec4(5, 71, 0, 1),
        vec4(42, 88, 0, 1),
        vec4(92, 64, 0, 1),
        vec4(64, 48, 0, 1),
        vec4(77, 16, 0, 1),
        vec4(20, 20, 0, 1),
        vec4(25, 46, 0, 1),
    ]

    let trackColors = trackPoints.map(() => vec4(0, 0, 0, 1));

    return [trackPoints, trackColors];
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    var pBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten([...points, ...trackPoints]), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten([...colors, ...trackColors]), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation( program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    
    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    // Draw the cube
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    // Draw track
    gl.drawArrays(gl.LINES, indices.length, trackPoints.length);

    // gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    // gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );

    // for( var i=0; i<index; i+=3)
    //     gl.drawArrays( gl.TRIANGLES, i, 3 );
    // gl.drawArrays( gl.LINE_LOOP, 0, index);
    // gl.drawArrays( gl.TRIANGLES, 0, index);

}

function rotateAndDrawNewFrame() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // modelMat = mult(modelMat, rotateX(3));
    // modelMat = mult(modelMat, rotateY(-3));
    // modelMat = mult(modelMat, rotateZ(3));
    
	let modelMatLoc = gl.getUniformLocation(program, 'modelViewMatrix');
	gl.uniformMatrix4fv(modelMatLoc, false, flatten(modelMat));

    // gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    gl.drawArrays(gl.LINES, points.length, trackPoints.length);
}


function projectPoint(point, modelMat, cameraMat, projectionMat) {
    // console.log(point, modelMat, cameraMat, projectionMat);
    // let worldPoint = mult(modelMat, point);
    // let viewPoint = mult(projectionMat, worldPoint);
    // let projectedPoint = mult(cameraMat, viewPoint);
    // let allMat = mult()

    // let projectedPoint = mult(mult(mult(projectionMat, cameraMat), modelMat), point);

    let worldVertex = mult(modelMat, point);

    // Apply view transformation
    let viewVertex = mult(cameraMat, worldVertex);

    // Apply projection transformation
    let projectedVertex = mult(projectionMat, viewVertex);

    // return normalizeToScreenCoordinates(projectedPoint, canvasWidth, canvasHeight);
    return projectedVertex;
}


function main() {
    // Retrieve <canvas> element
    canvas = document.getElementById('gl-canvas');
    // Get the rendering context for WebGL
    gl = WebGLUtils.setupWebGL(canvas);

    //Check that the return value is not null.
    if (!gl)
    {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    //Set up the viewport
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    // Initialize shaders
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    gl.enable(gl.DEPTH_TEST);

	cameraMat = lookAt(vec3(0, 0, -86), vec3(0, 0, 0), vec3(0, 1, 0));
    
	let cameraMatLoc = gl.getUniformLocation(program, 'cameraMatrix');
	gl.uniformMatrix4fv(cameraMatLoc, false, flatten(cameraMat));
    
    projectionMat = perspective(60, 1, 10, 120);
	let projectionMatLoc = gl.getUniformLocation(program, 'projectionMatrix');
	gl.uniformMatrix4fv(projectionMatLoc, false, flatten(projectionMat));

	let modelMatLoc = gl.getUniformLocation(program, 'modelViewMatrix');
	gl.uniformMatrix4fv(modelMatLoc, false, flatten(modelMat));


    [trackPoints, trackColors] = makeTrack();
    
    let [ps, is] = makeCube([0, 0, 0], 20);

    points = ps;
    indices = is;

    console.log(ps, is);

    let c_arr = [1, 0, 0];
    for (let i = 0; i < points.length; i++) {
        colors.push(vec4(...c_arr, 1));
        // colors.push(vec4(...c_arr, 1));
        // colors.push(vec4(...c_arr, 1));
        // colors.push(vec4(...c_arr, 1));

        c_arr.push(c_arr.splice(0, 1)[0]);
    }

    render();

    let framerate = 30;

    setInterval(rotateAndDrawNewFrame, 1000/framerate);
}