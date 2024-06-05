/* eslint-disable no-undef */
'use strict';


let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.


let numPointsU = 125; // Number of points in the u direction
let numPointsV = 125; // Number of points in the v direction
let damping_coef = 1; // damping coefficient
let b = 1; // length of the straight line segment
let m = 5; // number of half-waves
let fi = Math.PI / 4;
let rMax = 1.5; // Maximum r value
let lightX, lightY, lightZ;


// StereoCamera settings
let stereoCamera; // Holds the instance of the StereoCamera class for managing stereo (3D) rendering setup
let convergence; // Convergence distance: the point in space where the two eyes' views converge
let eyeSeparation; // Eye separation
let fov; // Field of View (in degrees)
let nearClippingDistance; // Near clipping distance: the closest distance from the camera at which objects are rendered
let farClippingDistance = 20.0; // Far clipping distance: the furthest distance from the camera at which objects are rendered


let webCamElement;
let webCamModel;

function initStereoCamera() {
    stereoCamera = new StereoCamera(
        convergence,
        eyeSeparation,
        gl.canvas.clientWidth / gl.canvas.clientHeight,
        fov,
        nearClippingDistance,
        farClippingDistance
    );
}

let normals = [];

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

function updateValue(elementId) {
    const range = document.getElementById(elementId);
    const valueDisplay = document.getElementById(elementId + "_value");
    valueDisplay.textContent = range.value;
}

function retrieveValuesFromInputs() {
    numPointsU = parseInt(document.getElementById('u_points').value);
    numPointsV = parseInt(document.getElementById('v_points').value);
    eyeSeparation = parseFloat(document.getElementById('eyeSeparation').value);
    fov = parseFloat(document.getElementById('fov').value);
    nearClippingDistance = parseFloat(document.getElementById('nearClipping').value);
    convergence = parseFloat(document.getElementById('convergence').value);

    lightX = deg2rad(parseInt(document.getElementById('x_light').value));
    lightY = deg2rad(parseInt(document.getElementById('y_light').value));
    lightZ = deg2rad(parseInt(document.getElementById('z_light').value));
    
}

function reDraw(){
    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());
    surface.NormalBufferData(normals);
    draw();
}

// Add event listeners to update displayed values when inputs change
document.getElementById('u_points').addEventListener('input', function () {
    updateValue('u_points');
    retrieveValuesFromInputs();
    reDraw();
});
document.getElementById('v_points').addEventListener('input', function () {
    updateValue('v_points');
    retrieveValuesFromInputs();
    reDraw();
});
document.getElementById('eyeSeparation').addEventListener('input', function () {
    updateValue('eyeSeparation');
    retrieveValuesFromInputs();
    initStereoCamera();
    draw();
});
document.getElementById('fov').addEventListener('input', function () {
    updateValue('fov');
    retrieveValuesFromInputs();
    initStereoCamera();
    draw();
});
document.getElementById('nearClipping').addEventListener('input', function () {
    updateValue('nearClipping');
    retrieveValuesFromInputs();
    initStereoCamera();
    draw();
});
document.getElementById('convergence').addEventListener('input', function () {
    updateValue('convergence');
    retrieveValuesFromInputs();
    initStereoCamera();
    draw();
});
document.getElementById('x_light').addEventListener('input', function () {
    updateValue('x_light');
    retrieveValuesFromInputs();
    reDraw();
});
document.getElementById('y_light').addEventListener('input', function () {
    updateValue('y_light');
    retrieveValuesFromInputs();
    reDraw();
});
document.getElementById('z_light').addEventListener('input', function () {
    updateValue('z_light');
    retrieveValuesFromInputs();
    reDraw();
});

// Initialize displayed values on page load
updateValue('u_points');
updateValue('v_points');
updateValue('eyeSeparation');
updateValue('fov');
updateValue('nearClipping');
updateValue('convergence');
updateValue('x_light');
updateValue('y_light');
updateValue('z_light');


//Constructor

function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        this.count = vertices.length / 3;

    }

    this.NormalBufferData = function (normalsList) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalsList), gl.STREAM_DRAW);
        this.count = normalsList.length / 3;
    }

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);
        
        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }

    this.DrawVisualDetails = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
   
        gl.drawArrays(gl.LINES, 0, this.count);
    }
}


function WebCameraImageModel(name){
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.texture = gl.createTexture();
    this.count = 0;

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    

    this.BufferData = function(vertices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        this.count = vertices.length / 3;
    }

    this.TextureBufferData = function (vertices) {
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.aTexCoord);

        //gl.uniform1i(shProgram.uTexture, 0);


        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }


}

// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    
    this.iAttribVertex = -1;
    this.iModelViewProjectionMatrix = -1;
    this.iAttribNormal = -1;
    this.iNormalMatrix = -1;
    this.lightPos = -1;

    this.iColor = -1;
    this.iUseColor = -1;

    // Get attribute location for texture coordinates
    this.aTexCoord = -1;
    this.uTexture = -1;

    this.iUseTexture = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


// Draws a Surface of Revolution with Damping Circular Waves, along with a set of coordinate axes.
function draw(animate = false) { 
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(shProgram.iUseColor, false);

    /* Set up the stereo camera system */
    initStereoCamera();

    // General settings

    /* Get the view matrix from the SimpleRotator object. */
    let viewMatrix = spaceball.getViewMatrix();

    /* Set the values of the Perspective projection transformation */
    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -5);

    let matAccum0 = m4.multiply(rotateToPointZero, viewMatrix);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    // Web Camera texture
    gl.uniform1f(shProgram.iUseTexture, true);
    gl.bindTexture(gl.TEXTURE_2D, webCamModel.texture);

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        webCamElement
    );
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, m4.identity());
    webCamModel.Draw();
    gl.clear(gl.DEPTH_BUFFER_BIT)
    gl.uniform1f(shProgram.iUseTexture, false);


    
    // Left eye
    stereoCamera.ApplyLeftFrustum();
    gl.colorMask(true, false, false, true); // Only draw red channel
    let projection = stereoCamera.projection;
    let modelView = stereoCamera.modelView;
    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, m4.multiply(modelView, matAccum1));
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    settingUpLightingScene(modelViewProjection);
    surface.Draw();
    drawMesh();
    // Clear depth buffer to prepare for right eye rendering
    gl.clear(gl.DEPTH_BUFFER_BIT);



    // Right eye
    stereoCamera.ApplyRightFrustum();
    gl.colorMask(false, true, true, true); // Only draw green and blue channels
    projection = stereoCamera.projection;
    modelView = stereoCamera.modelView;
    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    modelViewProjection = m4.multiply(projection, m4.multiply(modelView, matAccum1));
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    settingUpLightingScene(modelViewProjection);
    surface.Draw();
    drawMesh();
    gl.colorMask(true, true, true, true); // Restore color mask to default

    if (animate) {
        window.requestAnimationFrame(()=>draw(true));
    }
}

function settingUpLightingScene(modelViewProj){
    let modelviewInv = new Float32Array(16);
    let normalmatrix = new Float32Array(16);
    mat4Invert(modelViewProj, modelviewInv);
    mat4Transpose(modelviewInv, normalmatrix);

    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalmatrix);

    gl.uniform3fv(shProgram.lightPos, [lightX, lightY, lightZ]);
}

function drawMesh(){
    gl.colorMask(true, true, true, true); // Restore color mask to default
    gl.uniform4fv(shProgram.iColor, [0.01, 0.05, 0.45, 1]);
    gl.uniform1f(shProgram.iUseColor, true);
    surface.DrawVisualDetails();
    gl.uniform1f(shProgram.iUseColor, false);
}

// Normal Facet Average

function CreateSurfaceData()
{

    const vertexList = [];
    normals = [];
    let all_nor = [];


    for (let i = 0; i < numPointsU; i++) {

        let normals_row = [];

        for (let j = 0; j < numPointsV; j++) {
            const u1 = (i * 2 * Math.PI) / numPointsU; // Full revolution for i
            const u2 = ((i + 1) * 2 * Math.PI) / numPointsU; // Full revolution for i+1
            const v1 = (j / numPointsV) * rMax; // Height for j
            const v2 = ((j + 1) / numPointsV) * rMax; // Height for j+1
    
            //vertices
            const x1 = v1 * Math.cos(u1);
            const y1 = v1 * Math.sin(u1);
            const z1 = damping_coef * Math.exp(-Math.PI * v1) * Math.sin((m * Math.PI * v1) / b + fi);
    
            const x2 = v1 * Math.cos(u2);
            const y2 = v1 * Math.sin(u2);
            const z2 = damping_coef * Math.exp(-Math.PI * v1) * Math.sin((m * Math.PI * v1) / b + fi);
    
            const x3 = v2 * Math.cos(u1);
            const y3 = v2 * Math.sin(u1);
            const z3 = damping_coef * Math.exp(-Math.PI * v2) * Math.sin((m * Math.PI * v2) / b + fi);
    
            const x4 = v2 * Math.cos(u2);
            const y4 = v2 * Math.sin(u2);
            const z4 = damping_coef * Math.exp(-Math.PI * v2) * Math.sin((m * Math.PI * v2) / b + fi);
          
            vertexList.push(x1, y1, z1, x3, y3, z3, x2, y2, z2);
            vertexList.push(x2, y2, z2, x3, y3, z3, x4, y4, z4);

            
            //normals
            let vec21 = { x: x2-x1, y: y2-y1, z: z2-z1 };
            let vec31 = { x: x3-x1, y: y3-y1, z: z3-z1 };
            let nor1 = vec3_CrossProduct(vec21, vec31);
            vec3_Normalize(nor1);


            let vec34 = { x: x4-x3, y: y4-y3, z: z4-z3 };
            let vec24 = { x: x4-x2, y: y4-y2, z: z4-z2 };
            let nor2 = vec3_CrossProduct(vec34, vec24);
            vec3_Normalize(nor2);

            normals_row.push(nor1, nor1, nor1, nor2, nor2, nor2);

            
        }

        all_nor.push(normals_row);
        
    }


    for(let i = 0; i<all_nor.length;i++){
        for(let j = 0; j<all_nor[i].length; j++){
            let cnt = 0;
            let avg_nor = {x: 0, y: 0, z: 0};


            if(j>0){
                cnt++;
                avg_nor.x+=all_nor[i][j-1].x;
                avg_nor.y+=all_nor[i][j-1].y;
                avg_nor.z+=all_nor[i][j-1].z;
            }

            if(j<all_nor[i].length-1){
                cnt++;
                avg_nor.x+=all_nor[i][j+1].x;
                avg_nor.y+=all_nor[i][j+1].y;
                avg_nor.z+=all_nor[i][j+1].z;
            }

            if(i < all_nor.length-1){
                cnt++;
                avg_nor.x+=all_nor[i+1][j].x;
                avg_nor.y+=all_nor[i+1][j].y;
                avg_nor.z+=all_nor[i+1][j].z;
            }

            if(i > 0){
                cnt++;
                avg_nor.x+=all_nor[i-1][j].x;
                avg_nor.y+=all_nor[i-1][j].y;
                avg_nor.z+=all_nor[i-1][j].z;
            }

            normals.push(avg_nor.x/cnt, avg_nor.y/cnt,avg_nor.z/cnt)


        }
    }

    return vertexList;

}


function vec3_CrossProduct(a, b) {
    let x = a.y * b.z - b.y * a.z;
    let y = a.z * b.x - b.z * a.x;
    let z = a.x * b.y - b.x * a.y;
    return { x: x, y: y, z: z }
}

function vec3_Normalize(vec) {
    var magnitude  = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
    vec[0] /= magnitude ; vec[1] /= magnitude ; vec[2] /= magnitude ;
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );
    retrieveValuesFromInputs();
    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.lightPos = gl.getUniformLocation(prog, "lightPos");

    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iUseColor = gl.getUniformLocation(prog, "useColor");
    shProgram.iUseTexture = gl.getUniformLocation(prog, "useTexture");

    // Get attribute location for texture coordinates
    shProgram.aTexCoord = gl.getAttribLocation(prog, "a_texcoord");
    shProgram.uTexture = gl.getUniformLocation(prog, "u_texture");


    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());
    surface.NormalBufferData(normals);


    // WebCam model setup
    webCamModel = new WebCameraImageModel('WebCamera');
    webCamModel.BufferData([-1, -1, 0, 1, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 0])
    webCamModel.TextureBufferData([1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0])

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

/**
 * initialization function that will be called when the page has loaded
 */
export function init() {
    let canvas;
    webCamElement = initializeWebCamera();
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context. </p>" + e;
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    initStereoCamera();
    draw(true);
}



function mat4Transpose(a, transposed) {
    var t = 0;
    for (var i = 0; i < 4; ++i) {
        for (var j = 0; j < 4; ++j) {
            transposed[t++] = a[j * 4 + i];
        }
    }
}

function initializeWebCamera(){
    const webCam = document.createElement('video');
    webCam.setAttribute('autoplay', true);
    navigator.getUserMedia({ video: true, audio: false }, function (stream) {
        webCam.srcObject = stream;
    }, function (e) {
        console.error('Rejected!', e);
    });
    return webCam;
}

function mat4Invert(m, inverse) {
    var inv = new Float32Array(16);
    inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] +
        m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
    inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] -
        m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
    inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] +
        m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
    inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] -
        m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
    inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] -
        m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
    inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] +
        m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
    inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] -
        m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
    inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] +
        m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
    inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] +
        m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
    inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] -
        m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
    inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] +
        m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
    inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] -
        m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
    inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] -
        m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
    inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] +
        m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
    inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] -
        m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
    inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] +
        m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];

    var det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
    if (det == 0) return false;
    det = 1.0 / det;
    for (var i = 0; i < 16; i++) inverse[i] = inv[i] * det;
    return true;
}