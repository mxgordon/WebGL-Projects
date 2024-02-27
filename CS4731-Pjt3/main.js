let canvas;
let gl;
let program;

let stopSign;
let lamp;
let car;
let street;
let bunny;

let objs = [];

let eye = vec3(0, 5, 10);
let at = vec3(0, 0, 0);
let up = vec3(0, 1, 0);

let faces = [];
let colors = [];

// let modelTransform = mult(rotateX(45), mult(rotateY(0), rotateZ(0)));
let modelTransform = scalem(1, 1, 1);
let projectionMat = perspective(60, 1, 0.1, 40);
let cameraViewMat = lookAt(eye, at, up);

function renderModel(model) {
    console.log(model);

    for (let face of model.faces) {
        let flen = face.faceVertices.length;
        faces.push(...face.faceVertices);
        colors.push(...(new Array(flen)).fill(model.diffuseMap.get(face.material)));
    }
}


function testPos(pnt) {
    let transPnt = mult(modelTransform, pnt); // Transform by model matrix
    let camPnt = mult(cameraViewMat, transPnt); // Transform by camera (view) matrix
    let perspectPnt = mult(projectionMat, camPnt); // Transform by projection matrix
    
    // Perform perspective divide to get NDC
    let ndc = perspectPnt.map(v => (v / perspectPnt[3]));

    // The next step would be to map from NDC to canvas coordinates,
    // which typically involves scaling based on the viewport size and offset.
    // This step is not shown here but is necessary for final canvas positioning.

    console.log(ndc); // This now logs NDC, which need further transformation for canvas coordinates
}

function startPipeline() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	let cameraMatLoc = gl.getUniformLocation(program, 'cameraMatrix');
	gl.uniformMatrix4fv(cameraMatLoc, false, flatten(cameraViewMat));

    
	let modelMatLoc = gl.getUniformLocation(program, 'modelMatrix');
	gl.uniformMatrix4fv(modelMatLoc, false, flatten(modelTransform));

    
	let perspectiveMatLoc = gl.getUniformLocation(program, 'projectionMatrix');
	gl.uniformMatrix4fv(perspectiveMatLoc, false, flatten(projectionMat));

    for (let obj of objs) {
        renderModel(obj);
        // break
    }

    
    let pBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);  // load all the points from each subdivision into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(faces), gl.STATIC_DRAW);

    let vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);  // link the buffer with the shader


    let cBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);  // load all the points from each subdivision into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    let vColor = gl.getAttribLocation( program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);  // link the buffer with the shader

    gl.drawArrays(gl.TRIANGLES, 0, faces.length);

    console.log(colors, faces);

}

function main() {
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    gl = WebGLUtils.setupWebGL(canvas);

    //Check that the return value is not null.
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Set viewport
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Set clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Initialize shaders
    program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    gl.enable(gl.DEPTH_TEST);

    // Get the stop sign
    stopSign = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.mtl");

    // Get the lamp
    lamp = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.mtl");

    // Get the car
    car = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.mtl");

   // Get the street
    street = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.mtl");

    // Get the bunny (you will not need this one until Part II)
    bunny = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.mtl");

    // Wait for obj and texture loading to finish before running the rest of the program
    let intCallbk = setInterval(() => {
        if (stopSign.readyState && lamp.readyState && car.readyState && street.readyState && bunny.readyState) {
            clearInterval(intCallbk);
            objs = [lamp, stopSign, car, bunny, street];
            startPipeline();
        }
    }, 1000);
}
