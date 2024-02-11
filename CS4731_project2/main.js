let canvas;
let gl;
let program;

let projectionMat; 
let cameraMat;
let modelMat = scalem(1, 1, 1);

let points = [];
let colors = [];
let index = 0;

function triangle(a, b, c) {
    points.push(a);
    points.push(b);
    points.push(c);

    // flatShadingArray.push(a);
    // flatShadingArray.push(a);
    // flatShadingArray.push(a);

    // // normals are vectors

    // normalsArray.push(a[0],a[1], a[2], 0.0);
    // normalsArray.push(a[0],a[1], a[2], 0.0);
    // normalsArray.push(a[0],a[1], a[2], 0.0);

    index += 3;
}


function divideTriangle(a, b, c, count) {
   if ( count > 0 ) {

       var ab = mix( a, b, 0.5);
       var ac = mix( a, c, 0.5);
       var bc = mix( b, c, 0.5);

       ab = normalize(ab, true);
       ac = normalize(ac, true);
       bc = normalize(bc, true);

       divideTriangle( a, ab, ac, count - 1 );
       divideTriangle( ab, b, bc, count - 1 );
       divideTriangle( bc, c, ac, count - 1 );
       divideTriangle( ab, bc, ac, count - 1 );
   }
   else {
       triangle( a, b, c );
   }
}


function tetrahedron(a, b, c, d, n) {
   divideTriangle(a, b, c, n);
   divideTriangle(d, c, b, n);
   divideTriangle(a, d, b, n);
   divideTriangle(a, c, d, n);
}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // eye = vec3(0, 0, 1.5);

    // modelViewMatrix = lookAt(eye, at , up);
    // projectionMatrix = ortho(left, right, bottom, ytop, near, far);

    
    var pBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation( program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    // gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );

    // for( var i=0; i<index; i+=3)
    //     gl.drawArrays( gl.TRIANGLES, i, 3 );
    // gl.drawArrays( gl.LINE_LOOP, 0, index);
    gl.drawArrays( gl.TRIANGLES, 0, index);

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

	cameraMat = lookAt(vec3(0, 0, -80), vec3(0, 0, 0), vec3(0, 1, 0));
    
	let cameraMatLoc = gl.getUniformLocation(program, 'cameraMatrix');
	gl.uniformMatrix4fv(cameraMatLoc, false, flatten(cameraMat));
    
    projectionMat = perspective(60, 1, 10, 100);
	let projectionMatLoc = gl.getUniformLocation(program, 'projectionMatrix');
	gl.uniformMatrix4fv(projectionMatLoc, false, flatten(projectionMat));

	let modelMatLoc = gl.getUniformLocation(program, 'modelViewMatrix');
	gl.uniformMatrix4fv(modelMatLoc, false, flatten(modelMat));

    
    let va = vec4(0.0, 0.0, -50,1);
    let vb = vec4(0.0, 45, 16, 1);
    let vc = vec4(-40, -45, 16, 1);
    let vd = vec4(40, -45, 16,1);

    tetrahedron(va, vb, vc, vd, 0);
    let c_arr = [1, 0, 0];
    for (let i = 0; i < points.length/3; i++) {
        colors.push(vec4(...c_arr, 1));
        colors.push(vec4(...c_arr, 1));
        colors.push(vec4(...c_arr, 1));

        c_arr.push(c_arr.splice(0, 1)[0]);
    }

    points.forEach(point => {
        let glPoint = projectPoint(point, modelMat, cameraMat, projectionMat);
        console.log(`${glPoint}\n ${point}`);
        // Optionally, draw a small square or circle at screenPoint for visualization
    });
    



    render();
}