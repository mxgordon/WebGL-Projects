// For extra credit I included a button to export/download 
// the current SVG displayed
let svgDims = [0, 0, 1, 1];
let zoom = 1;
let rotation = 0
let dragging = false;
let shifting = false;
let originCenterMat = translate(0, 0, 0);
let translationMat = translate(0, 0, 0);
let rotationMat = rotateZ(0);
let scaleMat = scalem(zoom, zoom, 1);
let transformMat = mult(originCenterMat, rotationMat);
let realDims = [400, 400];
let points = [];
let colors = [];

let pBuffer;
let vPosition;
let cBuffer;
let vColor;

let canvas;
let program;
let gl;

function handleFiles(event) {
    let reader = readTextFile(event);
    reader.onload = function(){
        // Reset transformations and SVG data
        [points, colors] = [[], []];
        resetTransformations();

        // Parse SVG
        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(reader.result, "image/svg+xml");
        let xmlViewbox = xmlGetViewbox(xmlDoc, [0, 0, 400, 400]);
        
        svgDims = [xmlViewbox[0], xmlViewbox[1], xmlViewbox[2], xmlViewbox[3]]; 

        // Center the transformations about the center of the SVG
        originCenterMat = translate(-(svgDims[2]/2) - svgDims[0], -(svgDims[3]/2) - svgDims[1], 0);
        
        makeSquareAspectRatio();

        let [lines, lcolors] = xmlGetLines(xmlDoc, [0, 0, 0]);
        colors = lcolors;
        
        // Build the points array
        for (let [x1, y1, x2, y2] of lines) {
            points.push(vec4(x1, y1, 0, 1));
            points.push(vec4(x2, y2, 0, 1));
        }

        draw();
    }
}

function getOrthoDims() {
    let [width, height] = [svgDims[2], svgDims[3]];

    return [-width / 2, width / 2, height / 2, -height / 2];
}

function makeSquareAspectRatio() {
    let [svgWidth, svgHeight] = [svgDims[2], svgDims[3]];

    // Check which leg of the aspect ratio is larger and adjust dimensions to make square
    if (svgWidth < svgHeight) {
        svgDims[0] -= (svgHeight - svgWidth) / 2;
        svgDims[2] += (svgHeight - svgWidth);
    } else if (svgWidth > svgHeight) {
        svgDims[1] -= (svgWidth - svgHeight) / 2;
        svgDims[3] += (svgWidth - svgHeight);
    }
}

function draw() {
    // Points buffer
    pBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    
    // Bind points buffer to vPosition
    vPosition = gl.getAttribLocation(program,  "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    // Colors buffer
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    
    // Bind colors to vColor
    vColor = gl.getAttribLocation(program,  "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
	gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Setup orthographic bounding box
    let worldBoundaries = ortho(...getOrthoDims(), -1, 10);
    // Bind the boundaries to projMatrix
	let projMatrix = gl.getUniformLocation(program, "projMatrix");
	gl.uniformMatrix4fv(projMatrix, false, flatten(worldBoundaries));
    
    // Apply all of the transformations to one matrix
    transformMat = mult(translationMat, scaleMat);
    transformMat = mult(transformMat, rotationMat);
    transformMat = mult(transformMat, originCenterMat);
    // Bind transformation matrix to modelMatrix
	let modelMatrix = gl.getUniformLocation(program, "modelMatrix");
	gl.uniformMatrix4fv(modelMatrix, false, flatten(transformMat));

    // Clear canvas
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	// Draw the lines
	gl.drawArrays(gl.LINES , 0, points.length);
}

function handleScroll(event) {
    // Check if shift is held to determine whether to scale or rotate
    if (shifting) {
        zoom *= 1 + (event.wheelDelta/800);
        zoom = Math.min(10, Math.max(0.1, zoom));
        scaleMat = scalem(zoom, zoom, 1);
    } else {
        rotation += event.wheelDelta/5;
        rotationMat = rotateZ(rotation);
    }

    draw();
}

function handleDrag(event) {
    if (dragging) {
        //  Adjust translation matrix by a proportional amount relative to the mouse movement
        translationMat[0][3] += event.movementX * svgDims[2] / realDims[0];
        translationMat[1][3] += event.movementY * svgDims[3] / realDims[1];
    }

    draw();
}

function resetTransformations() {
    // Reset translation
    translationMat[0][3] = 0;
    translationMat[1][3] = 0;
    
    // Reset rotation
    rotation = 0;
    rotationMat = rotateZ(rotation);

    // Reset Scale
    zoom = 1;
    scaleMat = scalem(zoom, zoom, 1);

    draw();
}

function multVec(matrix, vec) {
    let result = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
        result[i] = matrix[i][0] * vec[0] +
                    matrix[i][1] * vec[1] +
                    matrix[i][2] * vec[2] +
                    matrix[i][3] * vec[3];
    }
    return result;
}

function drawLine({offsetX, offsetY}) {
    // Calculate normalized device coordinates from mouse coordinates
    let x = (offsetX / canvas.width) * 2 - 1;
    let y = -(offsetY / canvas.height) * 2 + 1;

    // Apply the inverse transformations to the mouse coordinates
    let invProjMat = inverse4(ortho(...getOrthoDims(), -1, 10));
    let invTransformMat = inverse4(transformMat);
    invTransformMat = mult(invTransformMat, invProjMat);

    let transformedPoint = multVec(invTransformMat, [x, y, 0, 1]);

    // Add object space point to array
    points.push(vec4(transformedPoint[0], transformedPoint[1], 0, 1));

    // Sets the line color
    colors.push(vec4(0.0, 0.0, 0.0, 1.0)); 

    // Update the points and colors buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    // Redraw the scene
    draw();
}

function generateOutputSVG() {
    let lines = []
    lines.push(`<svg viewBox='${svgDims[0]} ${svgDims[1]} ${svgDims[2]} ${svgDims[3]}' xmlns='http://www.w3.org/2000/svg'>\n`);

    for (let i = 0; i < points.length / 2; i++) {
        lines.push(`<line x1='${points[i*2][0]}' y1='${points[i*2][1]}' x2='${points[i*2+1][0]}' y2='${points[i*2+1][1]}' stroke='${rgbaToHex(colors[i*2])}' />\n`);
        console.log(rgbaToHex(colors[i*2]));
        console.log(lines[i+1]);
    }
    lines.push("</svg>");
    return lines;
}

function handleDownload() {
    let file = new File(generateOutputSVG(), 'export.svg', {
        type: 'image/svg+xml',
    });

    // Attaches virtual link element
    const link = document.createElement('a');
    const url = URL.createObjectURL(file);

    // Sets link source and file download
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    // Virtually clicks link to start file download
    link.click();
 
    // Removes virtual link
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}


function decToHex(dec) {
    // converts decimal number to hexadecimal string
    var hex = (Math.floor((dec*255))).toString(16);
    return (hex.length == 1 ? "0" : "") + hex;
  }
  
function rgbaToHex([r, g, b, a]) {
    // Converts RGBA array to hexadecimal color code
    return `#${decToHex(r)}${decToHex(g)}${decToHex(b)}`;
}

function main() {
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    // Get download button object and attach listener
    downloadBtn = document.getElementById('download');
    downloadBtn.addEventListener("click", () => handleDownload());

    // File handler
    const inputElement = document.getElementById("fileupload");
    inputElement.addEventListener("change", handleFiles, false);

    // Scroll handler
    canvas.addEventListener("wheel", handleScroll, false);
    
    // Drag handler
    canvas.addEventListener('mousedown', () => dragging = true);
    document.addEventListener('mouseup', () => dragging = false);
    document.addEventListener('mousemove', handleDrag);

    // Shift handler
    document.addEventListener('keydown', evt => evt.key === "Shift" ? shifting = true : null);
    document.addEventListener('keyup', evt => evt.key === "Shift" ? shifting = false : null);

    // Reset handler
    document.addEventListener('keydown', evt => evt.key === "r" ? resetTransformations() : null);

    canvas.addEventListener('contextmenu', evt => {
        evt.preventDefault();
        drawLine(evt);
        return false;
    }, false);

    // Get the rendering context for WebGL
    gl = WebGLUtils.setupWebGL(canvas);

    //Check that the return value is not null.
    if (!gl)
    {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    //Set up the viewport
    gl.viewport( 0, 0, canvas.width, canvas.height );
}