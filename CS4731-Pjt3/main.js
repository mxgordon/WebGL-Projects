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

let carPath = [
    vec4(2.8+0.15, 0, -2.8, 1),
    vec4(2.8+0.15, 0, 2.8, 1),
    vec4(-2.8+0.15, 0, 2.8, 1),
    vec4(-2.8+0.15, 0, -2.8, 1),
];
let activeLine = 0;
let lineDistance = 0.5

let materialShininess = 20;

let modelTransform = scalem(1, 1, 1);
let projectionMat = perspective(60, 13/7, 0.1, 200);
let cameraViewMat = lookAt(eye, at, up);

let lightLoc = vec4(0.1, 5, 0.1, 1);
let lightAmbient = vec4(0.3, 0.3, 0.3, 1.0 );
let lightDiffuse = vec4( 0.8, 0.8, 0.8, 1.0 );
let lightSpecular = vec4( 1.5, 1.5, 1.5, 1.0 );

let skybox = {length:0, start:0};

let lightActive = true;
let animateCamera = false;
let isMoving = false;
let castShadows = true;
let showSkybox = true;
let camFollow = false;
let carHasReflection = true;
let bunnyHasRefraction = true;

function chaikinCornerCut(loop, ratio=.25) {  // Use Chaikin's corner cutting algorithm to round any loop
    let newPoints = [];

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

function generateShadow(model) {  // Use a shadow projection matrix to project any face onto the y=0 plane
    let shadowPoints = [];
    let projMat = shadowProjectionMatY(lightLoc[1]);  // build the projection matrix
    let sourceTrans = translate(...lightLoc);
    let origTrans = translate(...negate(lightLoc));
    let shadowProjectTransform = mult(mult(sourceTrans, projMat), origTrans);

    for (let i = model.start; i < (model.start + model.length); i++) {  // iteratively project each face
        let transPoint = mult(model.transform, faces[i]);
        let sPoint = mult(shadowProjectTransform, transPoint);
        
        shadowPoints.push(sPoint);
    }

    return shadowPoints;
}

function parseModelData(model, start=0) {
    for (let face of model.faces) {
        let fLen = face.faceVertices.length;
        faces.push(...face.faceVertices);  // Push all the model data onto the global array 
        normals.push(...face.faceNormals);
        diffuseColors.push(...(new Array(fLen)).fill(model.diffuseMap.get(face.material)));
        specularColors.push(...(new Array(fLen)).fill(model.specularMap.get(face.material)));
        if (face.faceTexCoords.length > 0) {  // generate 3D texture coordinates to support cube textures
            textureCoords.push(...face.faceTexCoords.map(v => vec3(...v, 0)));
        } else {
            textureCoords.push(...(new Array(fLen)).fill(vec3(0, 0, -1)));
        }
    }
    // Store information about the length and starting index of the model
    model.start = start;
    model.length = faces.length - start;
    
    for (let m of model.children) {  // recursively continue
        parseModelData(m, faces.length);
    }
}

function renderModels(model, transform) {
    let currentTransform = mult(transform, model.transform);  // Load model matrix into GPU
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'modelMatrix'), false, flatten(currentTransform));

    // Set reflect and refraction variables
    gl.uniform1i(gl.getUniformLocation(program, 'isCarReflection'), model.hasReflection);
    gl.uniform1i(gl.getUniformLocation(program, 'isBunnyRefraction'), model.hasRefraction);
    
    // Draw the faces of the model
    gl.drawArrays(gl.TRIANGLES, model.start, model.length);

    gl.uniform1i(gl.getUniformLocation(program, 'isCarReflection'), false);
    gl.uniform1i(gl.getUniformLocation(program, 'isBunnyRefraction'), false);

    for (let m of model.children) {  // Recursively continue
        renderModels(m, currentTransform);
    }
}

function renderSkybox() {
    // Load model matrix for the skybox
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'modelMatrix'), false, flatten(translate(0, 0, 0)));

    gl.uniform1i(gl.getUniformLocation(program, 'isSkybox'), true);
    gl.drawArrays(gl.TRIANGLES, skybox.start, skybox.length);  // Draw faces with uniform variable set
    gl.uniform1i(gl.getUniformLocation(program, 'isSkybox'), false);
}

function makeSkybox() {
    let vertices = [  // Vertices of the skybox
        vec4(100, 100, 100, 1),
        vec4(100, -100, 100, 1),
        vec4(-100, -100, 100, 1),
        vec4(-100, 100, 100, 1),
        vec4(100, 100, -100, 1),
        vec4(100, -100, -100, 1),
        vec4(-100, -100, -100, 1),
        vec4(-100, 100, -100, 1),
    ] 

    let cFaces = [  // Indices for each face
        [0, 1, 2, 3], // +Z
        [4, 5, 6, 7], // -Z
        [0, 4, 5, 1], // +X
        [3, 7, 6, 2], // -X
        [0, 4, 7, 3], // +Y
        [1, 5, 6, 2], // -Y
    ]

    let tris = [];

    for (let [a, b, c, d] of cFaces) {  // Iteratively triangulate each quad
        tris.push(
            vertices[a],
            vertices[b],
            vertices[c],
        )
        tris.push(
            vertices[a],
            vertices[c],
            vertices[d],
        )
    }

    let diffColors = Array(tris.length).fill(vec4(0,0,0,1));
    let specColors = Array(tris.length).fill(vec4(0,0,0,1));

    let texCoords = Array(tris.length).fill(vec3(0,0,1));

    skybox.length = tris.length;
    skybox.start = faces.length;

    faces.push(...tris);  // Push all the data for the skybox to the global arrays
    normals.push(...tris);
    diffuseColors.push(...diffColors);
    specularColors.push(...specColors);
    textureCoords.push(...texCoords);
}

function loadBuffers() {    
    let pBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);  // load all the points into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(faces), gl.STATIC_DRAW);

    let vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);  // link the buffer with the shader


    let nBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);  // load all the normals into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    let vNormal = gl.getAttribLocation( program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);  // link the buffer with the shader


    let dBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, dBuffer);  // load all the diffuse colors into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(diffuseColors), gl.STATIC_DRAW);

    let vDiffuse = gl.getAttribLocation( program, "materialDiffuse");
    gl.vertexAttribPointer(vDiffuse, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vDiffuse);  // link the buffer with the shader

    
    let sBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, sBuffer);  // load all the specular colors into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(specularColors), gl.STATIC_DRAW);

    let vSpecular = gl.getAttribLocation( program, "materialSpecular");
    gl.vertexAttribPointer(vSpecular, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vSpecular);  // link the buffer with the shader


    let tBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);  // load all the texture coordinates into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(textureCoords), gl.STATIC_DRAW);

    let vTextureCoords = gl.getAttribLocation( program, "vTexCoord");
    gl.vertexAttribPointer(vTextureCoords, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTextureCoords);  // link the buffer with the shader
}

function camFollowCar() {
    let carTrans = street.children[0].transform;  // Get transform of the car
    let bunnyTrans = mult(carTrans, street.children[0].children[0].transform);  // get Transform of the bunny
    let followAt = mult(bunnyTrans, vec4(...at, 1));  // Generate the focus of the camera
    let followEye = mult(carTrans, vec4(.5, 1, .9, 1));  // Generate the eye location of the camera

    followAt[1] += 0.3;  // Raise the focus by 0.3 units

    cameraViewMat = lookAt(vec3(...followEye), vec3(...followAt), up);  // Generate the camera matrix
}

function drawNewFrame() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    
    
    if (isMoving) {  // Move car if toggled
        stepAlongPath(street.children[0]);
    }

    if (camFollow) {  // Lock camera to car if toggled
        camFollowCar();
    } else if (animateCamera) {  // Bob the camera around if toggled
        stepCamera();
    } else {
        cameraViewMat = lookAt(eye, at, up);  // Reset camera position to last "bob" point
    }

    street.children[0].hasReflection = carHasReflection;  // Set reflect and refraction variables
    street.children[0].children[0].hasRefraction = bunnyHasRefraction;

    gl.uniform1i(gl.getUniformLocation(program, 'lightActive'), lightActive);  // Set whether to include lighting
    
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'cameraMatrix'), false, flatten(cameraViewMat));   // Load camera matrix to GPU
    
    if (castShadows && lightActive) {  // Calculate shadows and load them on a different buffer if so
        gl.uniform1i(gl.getUniformLocation(program, 'isShadow'), true);

        let shadows = generateShadow(street.children[0]);  // Generate shadows for the car and stop sign
        shadows.push(...generateShadow(street.children[2]));
        shadows.push(...(new Array(faces.length - shadows.length)).fill(vec4(0, 0, 0, 0)));  // Shadow buffer hotfix
        
        let shadBuffer = gl.createBuffer();
        
        gl.bindBuffer(gl.ARRAY_BUFFER, shadBuffer);  // load all the points from the shadows into the buffer
        gl.bufferData(gl.ARRAY_BUFFER, flatten(shadows), gl.DYNAMIC_DRAW);
        
        let shadowPos = gl.getAttribLocation( program, "shadowPos");
        gl.vertexAttribPointer(shadowPos, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shadowPos);  // link the buffer with the shader
        
        gl.drawArrays(gl.TRIANGLES, 0, shadows.length);

        gl.uniform1i(gl.getUniformLocation(program, 'isShadow'), false);
    }

    renderModels(street, modelTransform);  // Render all the models recursively

    if (showSkybox) {
        renderSkybox();  // Render the skybox if toggled
    }
}

function stepCamera() {
    camTheta += camStepDeg;  // Rotate the camera around the origin

    let camThetaRad = camTheta * Math.PI / 180.;  // Convert to radians

    // Calculate the new position
    eye = vec3(Math.cos(camThetaRad) * camR, camBobSize * Math.sin(camBobFact * camThetaRad) + camHeight, Math.sin(camThetaRad) * camR);

    cameraViewMat = lookAt(eye, at, up);  // Generate new camera matrix
}

function stepAlongPath(model) {
    let stepSize = 0.08;

    let backPoint = carPath[activeLine];  // find the endpoints of the path its on
    let nextPoint = carPath[(activeLine + 1) % carPath.length];

    let path = subtract(nextPoint, backPoint);  // calculate the path the shape will travel
    let stepDistance = (stepSize / length(path));

    while (stepDistance > 1 - lineDistance ) {  // Does the cube need to change to the next line?
        activeLine = (activeLine + 1) % carPath.length;  // advance to the next line
        backPoint = nextPoint;
        nextPoint = carPath[(activeLine + 1) % carPath.length];  // pick the next point
        stepDistance -= (1-lineDistance);
        lineDistance = 0;
        path = subtract(nextPoint, backPoint);
    }
    lineDistance += stepDistance;  // increment the position
    
    let newPos = add(backPoint, scale(lineDistance, path));  // calculate the new position

    let angle = Math.atan2(path[0], path[2]) * 180 / Math.PI;
    let rotation = rotateY(angle);

    model.transform = mult(translate(...newPos), rotation);  // generate the new transformation matrix
}

function startPipeline() {  // Load all the initial values for uniform variables here
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'cameraMatrix'), false, flatten(cameraViewMat));

	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'modelMatrix'), false, flatten(modelTransform));

	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'projectionMatrix'), false, flatten(projectionMat));

	gl.uniform4fv(gl.getUniformLocation(program, 'lightDiffuse'), flatten(lightDiffuse));
	gl.uniform4fv(gl.getUniformLocation(program, 'lightSpecular'), flatten(lightSpecular));
	gl.uniform4fv(gl.getUniformLocation(program, 'lightAmbient'), flatten(lightAmbient));
	gl.uniform4fv(gl.getUniformLocation(program, 'lightPosition'), flatten(lightLoc));
    gl.uniform1i(gl.getUniformLocation(program, 'isShadow'), false);
    gl.uniform1i(gl.getUniformLocation(program, 'isSkybox'), false);
    gl.uniform1i(gl.getUniformLocation(program, 'isCarReflection'), false);

	gl.uniform1f(gl.getUniformLocation(program, 'shininess'), materialShininess);
	
    gl.uniform1i(gl.getUniformLocation(program, 'lightActive'), lightActive);

    parseModelData(street);  // Parse the models into the arrays
    makeSkybox();  // Generate the skybox

    loadBuffers();   // Load arrays into GPU

    let frameRate = 30;

    setInterval(drawNewFrame, 1000/frameRate);  // Set render call at 30 FPS
}

function configureTexture(image) {
    let tex = gl.createTexture();  // Create texture object and bind to 0th texture slot
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage2D(  // Load image into slot
        gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE,
        image
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.uniform1i(gl.getUniformLocation(program,"tex0"), 0);  // Set uniform variable to texture sampler
}

function configureCubeTexture(faces) {
    let cubeTexture = gl.createTexture(); // Create texture object and bind to 1st texture slot
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
    gl.uniform1i(gl.getUniformLocation(program, "skyCubeMap"), 1);

    faces.forEach((face) => {  // Load each texture for the cube into its respective position
        const { target, img } = face;
        gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    });
    
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Initialize shaders
    program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    gl.enable(gl.DEPTH_TEST);

    // Get the stop sign
    stopSign = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.mtl", 
        translate(-2, 0, 4));

    // Get the lamp
    lamp = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.mtl", 
        translate(0, 0, 0));
    
    // Get the bunny (you will not need this one until Part II)
    bunny = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.mtl", 
        translate(0, .7, 1.6));

    // Get the car
    car = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.mtl", 
        translate(2.8+0.15, 0, 0),
        [bunny]);

   // Get the street
    street = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.mtl",
        translate(0, 0, 0),
        [car, lamp, stopSign]);
    
    // Set Keyboard callbacks
    document.addEventListener("keydown", (evt => evt.key === "l" ? lightActive = !lightActive : null));
    document.addEventListener("keydown", (evt => evt.key === "c" ? animateCamera = !animateCamera : null));
    document.addEventListener("keydown", (evt => evt.key === "m" ? isMoving = !isMoving : null));
    document.addEventListener("keydown", (evt => evt.key === "s" ? castShadows = !castShadows : null));
    document.addEventListener("keydown", (evt => evt.key === "e" ? showSkybox = !showSkybox : null));
    document.addEventListener("keydown", (evt => evt.key === "d" ? camFollow = !camFollow : null));
    document.addEventListener("keydown", (evt => evt.key === "r" ? carHasReflection = !carHasReflection : null));
    document.addEventListener("keydown", (evt => evt.key === "f" ? bunnyHasRefraction = !bunnyHasRefraction : null));

    // Make the path round
    for (let i = 0; i < 8; i++) {
        carPath = chaikinCornerCut(carPath);
    }

    // Cube texturing
    let faces = [
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, imgName: 'posx' },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, imgName: 'negx' },
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, imgName: 'posy' },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, imgName: 'negy' },
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, imgName: 'posz' },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, imgName: 'negz' }
    ]

    let faceLoadCount = 0;

    for (let face of faces) {  // Start loaders for all skycube textures
        face.img = new Image();
        face.img.crossOrigin = "";
        face.img.src = "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/skybox_" + face.imgName + ".png";
        face.img.onload = (function()  {
            faceLoadCount++;
        });
    }

    // Wait for obj and texture loading to finish before running the rest of the program
    let intCallbk = setInterval(() => {
        if (stopSign.readyState && lamp.readyState && car.readyState && street.readyState && bunny.readyState && faceLoadCount === 6) {
            clearInterval(intCallbk);
            configureTexture(stopSign.image);

            configureCubeTexture(faces);

            startPipeline();
        }
    }, 200);
}
