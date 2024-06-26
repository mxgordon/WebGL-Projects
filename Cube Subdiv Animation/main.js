let canvas;
let gl;
let program;

let projectionMat; 
let cameraMat;
let modelMat = scalem(1, 1, 1);
let trackModelMat = scalem(1, 1, 1);

let allSubdivs = [];
let activeSubdiv = 0;

let trackSubdiv = [];
let activeTrackSubdiv = 0;

let activeLine = 0;
let lineDistance = 0;

let isWireframe = true;
let isMoving = false;

let wireColor = vec4(1, 1, 1, 1);
let shadedColor = vec4(1, .4, .05, 1);

let lightPosition = vec4(0, 0, 0, 1.0 ); 
let lightAmbient = vec4(0.3, 0.3, 0.3, 1.0 );
let lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
let lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

let materialAmbient = vec4( .9, 0.0, 1.0, 1.0 );
let materialDiffuse = vec4( 1.0, 1.0, 0.0, 1.0 );
let materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
let materialShininess = 20.0;

let isGouraudShading = true;

// returns the average of an arbitrary amount of points
function avgPoints(...points) {
    let result = points[0];
    for (let i = 1; i < points.length; i++) {
        result = add(result, points[i])
    }
    return scale(1/points.length, result);
}

// Performs a catmull-clark surface subdivision on a shape. 
// All operations used are explained here: https://en.wikipedia.org/wiki/Catmull%E2%80%93Clark_subdivision_surface
function catmullClarkSubdiv({points, edges, faces, start, size, indices_start, indices_size}) { 
    // Points generated for the new shape
    let facePoints = [];
    let edgePoints = [];
    let cornerPoints = [];

    // Geometry data for the new shape
    let newPoints = [];
    let newEdges = [];
    let newFaces = [];
    
    let edgePointsOffset = points.length;
    let facePointsOffset = points.length + edges.length;
    
    // Make a point in the center of each face
    for (let face of faces) {
        let fpoints = face.map(v => points[v]);
        facePoints.push(avgPoints(...fpoints));
    }

    // Make a point in place of the center of every edge in the shape
    for (let i = 0; i < edges.length; i++) {
        let edge = edges[i];
        let edgePnts = edge.map(v => points[v]);  // Get the current endpoints for the edge

        let adjacentFaces = faces.map((v, i) => i).filter(v => faces[v].includes(edge[0]) && faces[v].includes(edge[1]));  // find both faces that share this edge

        let facePnts = adjacentFaces.map(v => facePoints[v]);  // Get the points generated by these faces

        edgePoints.push(avgPoints(...edgePnts, ...facePnts));  // averages the two face points and two endpoints to get the point for the edge

        for (let j of adjacentFaces) {
            newEdges.push([i + edgePointsOffset, j + facePointsOffset]);  // Creates all the new edges that this point will connect to
        }
    }

    for (let i = 0; i < points.length; i++) {
        let adjacentFaces = faces.map((v, i) => i).filter(v => faces[v].includes(i));  // find all faces adjacent to this vertex
        let n = adjacentFaces.length;
        let F = avgPoints(...adjacentFaces.map(v => facePoints[v]));  // average the points that were created for these faces
        
        let adjacentEdges = [...flatten(edges.filter(v => v.includes(i)))].map(v => points[v]);  // find all the edges that this vertex is an endpoint to 
        let R = avgPoints(...adjacentEdges);  // average the midpoints of the edges

        let newPnt = scale(1/n, add(F, add(scale(2, R), scale(n-3, points[i]))));  // calculated the new position of this vertex

        cornerPoints.push(newPnt);

        let adjacentEdgeIdx = edges.map((v,i) => i).filter(v => edges[v].includes(i));  // Find all the edge points that should have an edge connecting it to this point

        for (let j of adjacentEdgeIdx) {
            newEdges.push([i, j + edgePointsOffset]);
        }
    }

    newPoints = [...cornerPoints, ...edgePoints, ...facePoints];  

    for (let i = 0; i < facePoints.length; i++) {  // From each of the face points, we need to construct the 4 faces they are a part of
        let face = faces[i];
        let edgePointIdxs = edges.map((v, i) => i).filter(v => face.includes(edges[v][0]) && face.includes(edges[v][1]));
        
        let firstEdgePointIdx = edgePointIdxs[0];  // get the point representing the old edge
        let nextCornerPointIdx = edges[firstEdgePointIdx][0];  // find the next point which is diagonal to the face point
        let lastEdgePointIdx = edgePointIdxs.slice(1, 4).filter(v => edges[v].includes(nextCornerPointIdx))[0];  // get the second edge point

        newFaces.push([i + facePointsOffset, firstEdgePointIdx + edgePointsOffset, nextCornerPointIdx, lastEdgePointIdx + edgePointsOffset]); 
        
        let firstEdgePointIdx2 = lastEdgePointIdx;  // rotate to the next edge point
        let nextCornerPointIdx2 = edges[firstEdgePointIdx2].filter(v => v !== nextCornerPointIdx)[0];  // find the second corner point
        let lastEdgePointIdx2 = edgePointIdxs.slice(1, 4).filter(v => v!== firstEdgePointIdx2 && edges[v].includes(nextCornerPointIdx2))[0];  // get the 3rd edge point
        
        newFaces.push([i + facePointsOffset, firstEdgePointIdx2 + edgePointsOffset, nextCornerPointIdx2, lastEdgePointIdx2 + edgePointsOffset]);
        
        let firstEdgePointIdx3 = lastEdgePointIdx2;  // rotate to the next edge point
        let nextCornerPointIdx3 = edges[firstEdgePointIdx3].filter(v => v !== nextCornerPointIdx2)[0];  // find the third corner point
        let lastEdgePointIdx3 = edgePointIdxs.slice(1, 4).filter(v => ![firstEdgePointIdx, firstEdgePointIdx2, firstEdgePointIdx3].includes(v))[0];  // get the final edge point
        
        newFaces.push([i + facePointsOffset, firstEdgePointIdx3 + edgePointsOffset, nextCornerPointIdx3, lastEdgePointIdx3 + edgePointsOffset]);
        
        let newCornerPointIdx4 = edges[lastEdgePointIdx3].filter(v => v !== nextCornerPointIdx3)[0];  // get the last corner point
        
        newFaces.push([i + facePointsOffset, lastEdgePointIdx3 + edgePointsOffset, newCornerPointIdx4, firstEdgePointIdx + edgePointsOffset]);
    }

    let newStart = start + size;

    let newIndices = [];
    for (let f of newFaces) {  // triangulate all of the faces
        newIndices.push(...f.slice(0, 3).map(v => v+newStart), f[0] + newStart, ...f.slice(2, 4).map(v => v + newStart)); // procedurally generate the indices
    }

    let normals = [];
    for (let p of newPoints) {
        normals.push(vec4b(...p));
    }

    return {points: newPoints, edges: newEdges, faces: newFaces, indices: newIndices, start: newStart, size: newPoints.length, indices_start: indices_start + indices_size, indices_size: newIndices.length, normals };
}

function chaikinCornerCut(loop) {
    let newPoints = [];
    let ratio = 1/4;

    for (let i = 0; i < loop.length; i++) {
        let firstPnt = loop[i];
        let secondPnt = loop[(i + 1) % loop.length];

        let path = subtract(secondPnt, firstPnt);

        newPoints.push(add(firstPnt, scale(ratio, path)));
        newPoints.push(add(firstPnt, scale(1 - ratio, path)));
    }

    newPoints.start = loop.start + loop.length;

    return newPoints;
}

function makeCube(center, radius) {
    let [cx, cy, cz] = center;

    let points = [  // these points all make up a cube
        vec4(cx-radius, cy-radius, cz+radius, 1), // Vertex 0
        vec4(cx-radius, cy+radius, cz+radius, 1), // Vertex 1
        vec4(cx+radius, cy+radius, cz+radius, 1), // Vertex 2
        vec4(cx+radius, cy-radius, cz+radius, 1), // Vertex 3
        vec4(cx-radius, cy-radius, cz-radius, 1), // Vertex 4
        vec4(cx-radius, cy+radius, cz-radius, 1), // Vertex 5
        vec4(cx+radius, cy+radius, cz-radius, 1), // Vertex 6
        vec4(cx+radius, cy-radius, cz-radius, 1)  // Vertex 7
    ];

    let edges = [  // indices of points
        [0, 1],  // bottom edges
        [1, 2],
        [2, 3],
        [3, 0],

        [0, 4],  // side edges
        [1, 5],
        [2, 6],
        [3, 7],

        [4, 5],  // top edges
        [5, 6],
        [6, 7],
        [7, 4]
    ]

    let faces = [  // indices of points
        [3, 2, 1, 0],
        [0, 1, 5, 4],
        [1, 2, 6, 5],
        [2, 3, 7, 6],
        [0, 3, 7, 4],
        [4, 5, 6, 7],

    ]

    let indices = [];
    for (let f of faces) {
        indices.push(...f.slice(0, 3), f[0], ...f.slice(2, 4)); // procedurally generate the indices by triangulated the faces
    }
    
    let normals = [];
    for (let p of points) {
        normals.push(vec4b(...p));
    }

    return {points, edges, faces, indices, start: 0, size: points.length, indices_start: 0, indices_size: indices.length, normals};
}

function makeTrack() {
    let trackPoints = [  // list of points that creates the "loop"
        vec4(45, 21, 0, 1),
        vec4(8, 47, 0, 1),
        vec4(-42, 14, 0, 1),
        vec4(-14, -2, 0, 1),
        vec4(-48, -34, 0, 1),
        vec4(40, -46, 0, 1),
        vec4(25, -4, 0, 1),
    ]
    trackPoints.start = 0;
    return trackPoints;
}

function loadModelData() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    let pBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);  // load all the points from each subdivision into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten([...allSubdivs.map(v => v.points).flat(1), ...trackSubdiv.flat(1)]), gl.STATIC_DRAW);

    let vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);  // link the buffer with the shader

    let nBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);  // load all the points from each subdivision into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten([...allSubdivs.map(v => v.normals).flat(1)]), gl.STATIC_DRAW);

    let vNormal = gl.getAttribLocation( program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);  // link the buffer with the shader

    let iBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);  // load all the indices from the points from each subdivision into a buffer
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([...allSubdivs.map(v => v.indices)].flat(1)), gl.STATIC_DRAW);
}

function stepCubeForward(nomove=false) {
    let stepSize = 1;
    let trackPoints = trackSubdiv[activeTrackSubdiv];

    let backPoint = trackPoints[activeLine];  // find the endpoints of the path its on
    let nextPoint = trackPoints[(activeLine + 1) % trackPoints.length];

    let path = subtract(nextPoint, backPoint);  // calculate the path the shape will travel
    let stepDistance = (stepSize / length(path));

    if (nomove) {
        let newPos = add(backPoint, scale(lineDistance, path));  // calculate the old position
        modelMat = translate(...newPos);  // generate the  transformation matrix
        return 
    }

    while (stepDistance > 1 - lineDistance ) {  // Does the cube need to change to the next line?
        activeLine = (activeLine + 1) % trackPoints.length;  // advance to the next line
        backPoint = nextPoint;
        nextPoint = trackPoints[(activeLine + 1) % trackPoints.length];  // pick the next point
        stepDistance -= (1-lineDistance);
        lineDistance = 0;
    }
    lineDistance += stepDistance;  // increment the position
    
    let newPos = add(backPoint, scale(lineDistance, path));  // calculate the new position

    modelMat = translate(...newPos);  // generate the new transformation matrix
}

function drawNewFrame() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (isMoving) {  // move cube if is in animate mode
        stepCubeForward();
    }
    
	let modelMatLoc = gl.getUniformLocation(program, 'modelMatrix');  // set model matrix for cube
	gl.uniformMatrix4fv(modelMatLoc, false, flatten(modelMat));
    
	let colorLoc = gl.getUniformLocation(program, 'currentColor');  // set draw color for cube
	gl.uniform4fv(colorLoc, isWireframe ? wireColor : shadedColor);
    
    gl.uniform1i(gl.getUniformLocation(program, "isWireframe"), isWireframe);
    gl.uniform1i(gl.getUniformLocation(program, "isGouraud"), isGouraudShading);

    // draw cube, accounts for whether its supposed to be wireframe
    gl.drawElements(isWireframe? gl.LINE_LOOP : gl.TRIANGLES, allSubdivs[activeSubdiv].indices_size, gl.UNSIGNED_SHORT, allSubdivs[activeSubdiv].indices_start*2);

	gl.uniformMatrix4fv(modelMatLoc, false, flatten(trackModelMat)); // sets the model matrix for the track
    
	gl.uniform4fv(colorLoc, wireColor);  // set draw color for track

    gl.uniform1i(gl.getUniformLocation(program, "isWireframe"), 1);

    // draws track
    gl.drawArrays(gl.LINE_LOOP, allSubdivs[5].start + allSubdivs[5].size + trackSubdiv[activeTrackSubdiv].start, trackSubdiv[activeTrackSubdiv].length);
}

function toggleSubdiv(key) {
    if (key === "q" && activeSubdiv > 0) {  // if q is pressed, unsubdivide cube
        activeSubdiv--;
        
    } else if (key === "e" && activeSubdiv < (allSubdivs.length - 1)) {  // if e is pressed, subdivide cube
        activeSubdiv++;
    }
}

function toggleTrackSubdiv(key) {
    if (key === "j" && activeTrackSubdiv > 0) {  // if q is pressed, unsubdivide track
        activeTrackSubdiv--;

        activeLine = activeLine / 2 + 0.25 + (lineDistance * .5);  // adjust the new active line and line distance values
        lineDistance = activeLine % 1;
        activeLine = Math.floor(activeLine) % trackSubdiv[activeTrackSubdiv].length;
        
        stepCubeForward(true);  // regenerate cube position
        
    } else if (key === "i" && activeTrackSubdiv < (trackSubdiv.length - 1)) {  // if e is pressed, subdivide track
        activeTrackSubdiv++;
        
        let adjust = Math.floor(lineDistance * 2 - 0.5)   // adjust the new active line and line distance values
        activeLine = (activeLine*2 + adjust) % trackSubdiv[activeTrackSubdiv].length;
        
        if (activeLine === -1) {
            activeLine = trackSubdiv[activeTrackSubdiv].length - 1;
        } 
        
        lineDistance = (lineDistance * 2 + .5) % 1;

        stepCubeForward(true);// regenerate cube position
    }
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
    gl.clearColor( 0, 0, 0, 1.0 );
    
    // Initialize shaders
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    gl.enable(gl.DEPTH_TEST);

    // setup camera/view matrix
	cameraMat = lookAt(vec3(0, 0, -100), vec3(0, 0, 0), vec3(0, 1, 0));
    
    // set camera matrix
	let cameraMatLoc = gl.getUniformLocation(program, 'cameraMatrix');
	gl.uniformMatrix4fv(cameraMatLoc, false, flatten(cameraMat));
    
    // set project matrix so that at z=0, the dimensions around about 100x100
    projectionMat = perspective(60, 1, 10, 120);
	let projectionMatLoc = gl.getUniformLocation(program, 'projectionMatrix');
	gl.uniformMatrix4fv(projectionMatLoc, false, flatten(projectionMat));

    
    gl.uniform4fv(gl.getUniformLocation(program, "lightDiffuse"), flatten(lightDiffuse));
    gl.uniform4fv(gl.getUniformLocation(program, "materialDiffuse"), flatten(materialDiffuse));
    gl.uniform4fv(gl.getUniformLocation(program, "lightSpecular"), flatten(lightSpecular));
    gl.uniform4fv(gl.getUniformLocation(program, "materialSpecular"), flatten(materialSpecular));
    gl.uniform4fv(gl.getUniformLocation(program, "lightAmbient"), flatten(lightAmbient));
    gl.uniform4fv(gl.getUniformLocation(program, "materialAmbient"), flatten(materialAmbient));

    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

    // create track
    trackSubdiv.push(makeTrack());

    for (let i = 0; i < 8; i++) {
        trackSubdiv.push(chaikinCornerCut(trackSubdiv[i]));
    }

    // position the cube at the start of the track
    modelMat = translate(...trackSubdiv[0][0]);

	let modelMatLoc = gl.getUniformLocation(program, 'modelViewMatrix');
	gl.uniformMatrix4fv(modelMatLoc, false, flatten(modelMat));

    // make cube
    let cube = makeCube([0, 0, 0], 5);
    allSubdivs.push(cube);

    // make the 5 subdivisions for the cube
    for (let i = 0; i < 5; i++) {
        allSubdivs.push(catmullClarkSubdiv(allSubdivs[i]));
    }

    // set listeners for the keypresses
    document.addEventListener("keydown", (evt => evt.key === "m" ? isWireframe = !isWireframe : null));
    document.addEventListener("keydown", (evt => evt.key === "a" ? isMoving = !isMoving : null));
    document.addEventListener("keydown", (evt => evt.key === "l" ? isGouraudShading = !isGouraudShading : null));
    document.addEventListener("keydown", (evt => toggleSubdiv(evt.key)));
    document.addEventListener("keydown", (evt => toggleTrackSubdiv(evt.key)));

    // load data into GPU
    loadModelData();

    // framerate of the simulation
    let framerate = 30;

    // start animation
    setInterval(drawNewFrame, 1000/framerate);
}