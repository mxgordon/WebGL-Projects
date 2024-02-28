let canvas;
let gl;
let program;

let stopSign;
let lamp;
let car;
let street;
let bunny;

let objs = [];

let camR = 6;
let camTheta = 0;
let camStepDeg = 1;
let camBobFact = 6;
let camBobSize = 0.4;
let camHeight = 3

let eye = vec3(camR, camHeight, 0);
let at = vec3(0, 0, 0);
let up = vec3(0, 1, 0);

let faces = [];
let normals = [];
let diffuseColors = [];
let specularColors = [];
let textureCoords = [];

let materialShininess = 20;

let modelTransform = scalem(1, 1, 1);
let projectionMat = perspective(60, 13/7, 0.1, 20);
let cameraViewMat = lookAt(eye, at, up);

let lightLoc = vec4(0, 3, 0, 1);
let lightAmbient = vec4(0.3, 0.3, 0.3, 1.0 );
let lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
let lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

let lightActive = true;
let animateCamera = false;

function parseModelData(model) {
    console.log(model);

    for (let face of model.faces) {
        let fLen = face.faceVertices.length;
        faces.push(...face.faceVertices);
        normals.push(...face.faceNormals);
        diffuseColors.push(...(new Array(fLen)).fill(model.diffuseMap.get(face.material)));
        specularColors.push(...(new Array(fLen)).fill(model.specularMap.get(face.material)));
        if (face.faceTexCoords.length > 0) {
            textureCoords.push(...face.faceTexCoords.map(v => vec3(...v, 0)));
        } else {
            textureCoords.push(...(new Array(fLen)).fill(vec3(0, 0, -1)));
        }
    }
}

function loadBuffers() {    
    let pBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);  // load all the points from each subdivision into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(faces), gl.STATIC_DRAW);

    let vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);  // link the buffer with the shader


    let nBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);  // load all the points from each subdivision into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    let vNormal = gl.getAttribLocation( program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);  // link the buffer with the shader


    let dBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, dBuffer);  // load all the points from each subdivision into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(diffuseColors), gl.STATIC_DRAW);

    let vDiffuse = gl.getAttribLocation( program, "materialDiffuse");
    gl.vertexAttribPointer(vDiffuse, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vDiffuse);  // link the buffer with the shader

    
    let sBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, sBuffer);  // load all the points from each subdivision into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(specularColors), gl.STATIC_DRAW);

    let vSpecular = gl.getAttribLocation( program, "materialSpecular");
    gl.vertexAttribPointer(vSpecular, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vSpecular);  // link the buffer with the shader


    let tBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);  // load all the points from each subdivision into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(textureCoords), gl.STATIC_DRAW);

    let vTextureCoords = gl.getAttribLocation( program, "vTexCoord");
    gl.vertexAttribPointer(vTextureCoords, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTextureCoords);  // link the buffer with the shader
}


function applyTransform(pnt) {
    let transPnt = mult(modelTransform, pnt); // Transform by model matrix
    let camPnt = mult(cameraViewMat, transPnt); // Transform by camera (view) matrix
    let perspectPnt = mult(projectionMat, camPnt); // Transform by projection matrix
    return perspectPnt;
}

function drawNewFrame() {
    if (animateCamera) {
        stepCamera();
    }

    gl.uniform1i(gl.getUniformLocation(program, 'lightActive'), lightActive);

	let cameraMatLoc = gl.getUniformLocation(program, 'cameraMatrix');
	gl.uniformMatrix4fv(cameraMatLoc, false, flatten(cameraViewMat));

    gl.drawArrays(gl.TRIANGLES, 0, faces.length);
}

function stepCamera() {
    camTheta += camStepDeg;

    let camThetaRad = camTheta * Math.PI / 180.;

    eye = vec3(Math.cos(camThetaRad) * camR, camBobSize * Math.sin(camBobFact * camThetaRad) + camHeight, Math.sin(camThetaRad) * camR);

    cameraViewMat = lookAt(eye, at, up);
}

function startPipeline() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	let cameraMatLoc = gl.getUniformLocation(program, 'cameraMatrix');
	gl.uniformMatrix4fv(cameraMatLoc, false, flatten(cameraViewMat));

    
	let modelMatLoc = gl.getUniformLocation(program, 'modelMatrix');
	gl.uniformMatrix4fv(modelMatLoc, false, flatten(modelTransform));

    
	let perspectiveMatLoc = gl.getUniformLocation(program, 'projectionMatrix');
	gl.uniformMatrix4fv(perspectiveMatLoc, false, flatten(projectionMat));

    
	gl.uniform4fv(gl.getUniformLocation(program, 'lightDiffuse'), flatten(lightDiffuse));
	gl.uniform4fv(gl.getUniformLocation(program, 'lightSpecular'), flatten(lightSpecular));
	gl.uniform4fv(gl.getUniformLocation(program, 'lightAmbient'), flatten(lightAmbient));
	gl.uniform4fv(gl.getUniformLocation(program, 'lightPosition'), flatten(lightLoc));

	gl.uniform1f(gl.getUniformLocation(program, 'shininess'), materialShininess);
	
    gl.uniform1i(gl.getUniformLocation(program, 'lightActive'), lightActive);

    for (let obj of objs) {
        parseModelData(obj);
    }

    loadBuffers();

    let frameRate = 30;

    setInterval(drawNewFrame, 1000/frameRate);

    console.log(diffuseColors, specularColors, faces, textureCoords);
}

function configureTexture(image) {
    let tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE,
        image
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);


    gl.uniform1i(gl.getUniformLocation(program,"tex0"), 0);
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

    
    // Set Keyboard callbacks
    document.addEventListener("keydown", (evt => evt.key === "l" ? lightActive = !lightActive : null));
    document.addEventListener("keydown", (evt => evt.key === "c" ? animateCamera = !animateCamera : null));

    // Wait for obj and texture loading to finish before running the rest of the program
    let intCallbk = setInterval(() => {
        if (stopSign.readyState && lamp.readyState && car.readyState && street.readyState && bunny.readyState) {
            clearInterval(intCallbk);
            configureTexture(stopSign.image);
            objs = [lamp, stopSign, car, bunny, street];
            startPipeline();
        }
    }, 1000);
}
