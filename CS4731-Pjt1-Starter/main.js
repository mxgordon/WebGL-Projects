// require("./lib/cs4731pjt1.js");

function handleFiles(event) {
    console.log(event);
    let reader = readTextFile(event);
//     console.log(reader);
//     console.log(xmlGetLines(event.target.files[0], ));
    reader.onload = function(){
        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(reader.result, "image/svg+xml");
        dims = xmlGetViewbox(xmlDoc, [0, 0, 1, 1]);          
        let lines = xmlGetLines(xmlDoc, [0, 0, 0]);
        console.log(lines);
    }
}

function main() {
    // Retrieve <canvas> element
    const canvas = document.getElementById('webgl');

    const inputElement = document.getElementById("fileupload");
    inputElement.addEventListener("change", handleFiles, false);

    // Get the rendering context for WebGL
    let gl = WebGLUtils.setupWebGL(canvas, undefined);

    //Check that the return value is not null.
    if (!gl)
    {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    let program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    //Set up the viewport
    gl.viewport( 0, 0, 400, 400);
}
