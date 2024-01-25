let svgDims = [0, 0, 1, 1];
let realDims = [400, 400];
let lines = [];
let points = [];
let colors = [];

let canvas;
let program;
let gl;

function handleFiles(event) {
    let reader = readTextFile(event);
    reader.onload = function(){
        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(reader.result, "image/svg+xml");
        let xmlViewbox = xmlGetViewbox(xmlDoc, [0, 0, 1, 1]);

        svgDims = [xmlViewbox[0], xmlViewbox[1], xmlViewbox[0] + xmlViewbox[2], xmlViewbox[1] + xmlViewbox[3]]; 

        makeSquareAspectRatio();

        [lines, colors] = xmlGetLines(xmlDoc, [0, 0, 0]);
        
        for (let [x1, y1, x2, y2] of lines) {
            points.push(vec4(x1, y1, 0, 1));
            points.push(vec4(x2, y2, 0, 1));
        }

        draw();
    }
}

function makeSquareAspectRatio() {
    let [svgWidth, svgHeight] = [svgDims[2]-svgDims[0], svgDims[3]-svgDims[1]];
    console.log([svgWidth, svgHeight]);
    if (svgWidth < svgHeight) {
        svgDims[0] -= (svgHeight - svgWidth) / 2;
        svgDims[2] += (svgHeight - svgWidth) / 2;
    } else if (svgWidth > svgHeight) {
        svgDims[1] -= (svgWidth - svgHeight) / 2;
        svgDims[3] += (svgWidth - svgHeight) / 2;
    }
}

function draw() {
    var pBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    
    
    var vPosition = gl.getAttribLocation(program,  "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    
    var vColor = gl.getAttribLocation(program,  "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
	gl.clear(gl.COLOR_BUFFER_BIT);
    
    
    let worldBoundaries = ortho(svgDims[0], svgDims[2], svgDims[3], svgDims[1], -1, 10);
    
	let projMatrix = gl.getUniformLocation(program, "projMatrix");
	gl.uniformMatrix4fv(projMatrix, false, flatten(worldBoundaries));

    
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	// Draw the lines
	gl.drawArrays(gl.LINES , 0, points.length);

}

function main() {
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    const inputElement = document.getElementById("fileupload");
    inputElement.addEventListener("change", handleFiles, false);

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