import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { THREEVideoPlayer } from '/src/three-video-player.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Frustum } from 'three/webgpu';
import { LineSegments } from 'three/webgpu';
import { EdgesGeometry } from 'three/webgpu';
//import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';


//import CoffeeVideo from './3d.mp4';
import CoffeeVideo from './Pot3D.mp4';
//import CoffeeVideo from './bw.mp4';
import { array, buffer, float, vec2 } from 'three/tsl';
import { AxesHelper } from 'three/webgpu';
import { WebGL } from 'three/examples/jsm/Addons.js';

let material;
let mesh;
let geometry;

async function loadShader(url) {
  const res = await fetch(url);
  return await res.text();
}

const vertexShader = await loadShader('./vertex.glsl');
const fragmentShader = await loadShader('./fragment.glsl');

const EmptyVertex = await loadShader('./EmptyVertex.glsl');
const EncodeData = await loadShader('./EncodeData.glsl');


const scene = new THREE.Scene();
const videoscene = new THREE.Scene();

// Create orthographic camera
const aspect = 16 / 9;
const size = .5; // scale factor for how “tight” the camera is around the object
const orthoCamera = new THREE.OrthographicCamera(
  -aspect * size,
  aspect * size,
  size,
  -size,
  .5,
  2
);

orthoCamera.position.set(0, .5, 1);
orthoCamera.updateMatrixWorld();
//orthoCamera.lookAt(0, 0, 0);
//scene.add(new THREE.CameraHelper(orthoCamera));


// const orthoCameraStripe = new THREE.OrthographicCamera(
//   -(1/22) * size,
//   (1/22) * size,
//   size,
//   -size,
//   .5,
//   2
// );

// orthoCameraStripe.position.set(-0.866666666, .5, 1);
// orthoCameraStripe.updateMatrixWorld();
// //orthoCamera.lookAt(0, 0, 0);
// scene.add(new THREE.CameraHelper(orthoCameraStripe));

const rtWidth = 1920;
const rtHeight = 1080;
const renderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight,{
  format: THREE.RGBAFormat,
  type: THREE.FloatType
});
//renderTarget.texture.colorSpace = THREE.SRGBColorSpace;//doesnt change anything

// const renderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight,{
// 	colorSpace: THREE.LinearSRGBColorSpace,
//   type: THREE.HalfFloatType
// });
//const renderTargetEncodeStripe = new THREE.WebGLRenderTarget(2, 45);
// const videoMaterial = new THREE.MeshBasicMaterial({
//         map: videoTexture,
//         toneMapped: false,
// });
// 4. Create and add mesh
// const planeGeometry = new THREE.PlaneGeometry(16, 9);
// const videoScreen = new THREE.Mesh(planeGeometry, videoMaterial);
// scene.add(videoScreen);


const videoPlayerObject = new THREEVideoPlayer({
	source: CoffeeVideo,
	play_btn_color: 0x6EABDD
});

videoPlayerObject.position.y = 0.5;
videoscene.add(videoPlayerObject);

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
//const cubeMaterial = new THREE.MeshBasicMaterial({color: "red"});
const cubeMaterial = new THREE.MeshStandardMaterial();

const cubeMesh = new THREE.Mesh(
	cubeGeometry,
	cubeMaterial
);
cubeMesh.position.set(-57.96,10.62,-101.05);
cubeMesh.scale.set(10,10,10);
//scene.add(cubeMesh);


const cube2Geometry = new THREE.BoxGeometry(1, 1, 1);
//const cubeMaterial = new THREE.MeshBasicMaterial({color: "red"});
const cube2Material = new THREE.MeshStandardMaterial();

const cube2Mesh = new THREE.Mesh(
	cube2Geometry,
	cube2Material
);
cube2Mesh.position.set(-54.3951,16.0187,-101.1039);
cube2Mesh.scale.set(0.8113898,0.8045293,1.968873);
//scene.add(cube2Mesh);

const cube3Mesh = new THREE.Mesh(
	cube2Geometry,
	cube2Material
);
 cube3Mesh.position.set(-55.357,15.696,-101.03);
cube3Mesh.scale.set(0.1,0.1,0.1);
//scene.add(cube3Mesh);


const light = new THREE.AmbientLight(0xffffff, .1);
//scene.add(light);
//scene.add(new THREE.AxesHelper);
const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(-54.398,20.62,-101.11);
//scene.add(pointLight);

const camera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	.03,
	3000
);
camera.position.z = 5
const canvas = document.querySelector('canvas.threejs')

const renderer = new THREE.WebGLRenderer({
	canvas: canvas,
	antialias: true,
});




// Add "click" event listener to trigger video play / pause
// renderer.domElement.addEventListener('mousedown', function (event) {
// 	// Prevent default event handling
// 	event.preventDefault();

// 	// Store event position as THREE JS Vector2
// 	var mousePosition = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);

// 	// Create & configure raycaster
// 	var raycaster = new THREE.Raycaster();
// 	raycaster.setFromCamera(mousePosition, camera);

// 	// Check if event position intersects videoPlayerObject and if videoPlayerObject can play
// 	var intersects = raycaster.intersectObject(videoPlayerObject, true);
// 	if (intersects.length > 0 && videoPlayerObject.canPlay()) {
// 		// Play video if paused, pause if playing
// 		if (videoPlayerObject.isPaused()) {
// 			videoPlayerObject.play();
// 		} else {
// 			videoPlayerObject.pause();
// 		}
// 	}
// });
const width = 1500, height = 1500;
const nearClipping = 1, farClipping = 2;
const _UseDecodedDepthRange = 1;
const _UseDecodedFocal = 1;
geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array(width * height * 3);

  for (let i = 0, j = 0, l = vertices.length; i < l; i += 3, j++) {
    vertices[i] = j % width;
    vertices[i + 1] = Math.floor(j / width);
  }

geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
// console.log('getTexture:', videoPlayerObject.getTexture);
// console.log(Object.keys(videoPlayerObject));

const texture = renderTarget.texture;
texture.minFilter = THREE.NearestFilter;
//texture.magFilter = THREE.NearestFilter;
texture.generateMipmaps = false;
const _UseDecodedRotation = 1.0;
material = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      width: { value: width },
      height: { value: height },
      nearClipping: { value: nearClipping },
      farClipping: { value: farClipping },
      pointSize: { value: 2 },
      zOffset: { value: 1000 },
	    scale: { value: 1},
	    UseDecodedPosition: { value: 1},
      _UseDecodedRotation: {value: _UseDecodedRotation},
      _UseDecodedDepthRange: {value: _UseDecodedDepthRange},
      _UseDecodedFocal: {value: _UseDecodedFocal}
    },
    vertexShader,
    fragmentShader,
    blending: THREE.NoBlending,
    depthTest: true,
    depthWrite: true,
    transparent: false
});
mesh = new THREE.Points(geometry, material);
mesh.frustumCulled = false;
scene.add(mesh);

let dummyCameraOrtho = new THREE.OrthographicCamera();
const Orthohelper = new THREE.CameraHelper(dummyCameraOrtho);
scene.add(Orthohelper);
let dummyCameraPerspec = new THREE.PerspectiveCamera();
const Perspechelper = new THREE.CameraHelper(dummyCameraPerspec);
scene.add(Perspechelper);
const _PosX = 0.0;
const _PosY = 0.0;
const _PosZ = 0.0;
const _QuaterionX = 0.0;
const _QuaterionY = 0.0;
const _QuaterionZ = 0.0;
const _QuaterionW = 0.0;
const _FOVSIZE = 0.0;
const _NEAR = 0.0;
const _FAR = 0.0;
const _isOrtho = 0.0;

const quadGeometry = new THREE.PlaneGeometry(1,1);
const quadmaterial = new THREE.ShaderMaterial({
  uniforms: {
    _PosX: { value: _PosX },
    _PosY: { value: _PosY },
    _PosZ: { value: _PosZ },
    _QuaterionX: { value: _QuaterionX },
    _QuaterionY: { value: _QuaterionY },
    _QuaterionZ: { value: _QuaterionZ },
    _QuaterionW: { value: _QuaterionW },
    _FOVSIZE: { value: _FOVSIZE },
    _NEAR: { value: _NEAR },
    _FAR: { value: _FAR },
    _isOrtho: { value: _isOrtho }
    
  },
  vertexShader: EmptyVertex,
  fragmentShader: EncodeData,
  blending: THREE.NormalBlending,
  depthTest: true,
  depthWrite: true,
  transparent: true
});
const quad = new THREE.Mesh(
	quadGeometry,
	quadmaterial
);
quad.position.set(-0.88888888+(1/45),0.5,0.025);
quad.scale.set(2/45,1,1);

//videoscene.add(quad);//used for debuging
const gui = new GUI();

const myObject = {
	volume: 1,
	time: 0,
  play: function() { videoPlayerObject.play()},
  pause: function() { videoPlayerObject.pause()},
  teleport: function() {teleport()},
  constructFrustum: function() {constructFrustum()},
  enableFrustrumVisual: false
};
gui.add(myObject, 'volume', 0,1).onChange(value => {
videoPlayerObject.setVolume(value);
});
gui.add(myObject, 'time', 0,1).onChange(value => {
videoPlayerObject.setScrub(value);
}).listen();
gui.add(myObject, 'play');
gui.add(myObject, 'pause');
gui.add(myObject, 'teleport');
//gui.add(myObject, 'constructFrustum');
gui.add(myObject, 'enableFrustrumVisual')

//gui.add(material.uniforms.nearClipping, 'value', 1, 10000, 1).name('nearClipping');
//gui.add(material.uniforms.farClipping, 'value', 1, 10000, 1).name('farClipping');
//gui.add(material.uniforms.pointSize, 'value', 1, 10, 1).name('pointSize');
//gui.add(material.uniforms.zOffset, 'value', 0, 4000, 1).name('zOffset');
//gui.add(material.uniforms.scale, 'value', 0.01, 1).name('scale');
gui.add(material.uniforms.UseDecodedPosition, 'value', 0, 1,1).name('UseDecodedPosition');
gui.add(material.uniforms._UseDecodedRotation, 'value', 0, 1,1).name('_UseDecodedRotation');
gui.add(material.uniforms._UseDecodedDepthRange, 'value', 0, 1,1).name('_UseDecodedDepthRange');
gui.add(material.uniforms._UseDecodedFocal, 'value', 0, 1,1).name('_UseDecodedFocal');

  //gui.add(quadmaterial.uniforms._PosX, 'value', -10, 1500).name('_PosX');
//  gui.add(quadmaterial.uniforms._PosY, 'value', -10, 10).name('_PosY');
//  gui.add(quadmaterial.uniforms._PosZ, 'value', -10, 10).name('_PosZ');
//  gui.add(quadmaterial.uniforms._QuaterionX, 'value', -1, 1).name('_QuaterionX');
//  gui.add(quadmaterial.uniforms._QuaterionY, 'value', -1, 1).name('_QuaterionY');
//  gui.add(quadmaterial.uniforms._QuaterionZ, 'value', -1, 1).name('_QuaterionZ');
//  gui.add(quadmaterial.uniforms._QuaterionW, 'value', -1, 1).name('_QuaterionW');
//  gui.add(quadmaterial.uniforms._FOVSIZE, 'value', 0, 180, 1).name('_FOVSIZE');
// gui.add(quadmaterial.uniforms._NEAR, 'value', 0, 3).name('_NEAR');
// gui.add(quadmaterial.uniforms._FAR, 'value', 0, 3).name('_FAR');
//  gui.add(quadmaterial.uniforms._isOrtho, 'value', 0, 1, 1).name('_isOrtho');

renderer.setSize(window.innerWidth, window.innerHeight);
const maxPixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(maxPixelRatio);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = false;
//controls.autoRotate = true

document.getElementById('videoUpload').addEventListener('change', handleVideoUpload);

window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix()
	renderer.setSize(window.innerWidth, window.innerHeight)
})


const renderloop = () => {
	renderer.setRenderTarget( renderTarget );
  
	renderer.render( videoscene, orthoCamera );
	renderer.setRenderTarget( null );
  //renderer.setRenderTarget(renderTargetEncodeStripe);
  //renderer.render( scene, orthoCameraStripe );
  //renderer.setRenderTarget( null );
	//controls.update(); 
  renderer.render(scene, camera);
	window.requestAnimationFrame(renderloop);
	myObject.time = videoPlayerObject.getTimeNorm();
  if(myObject.enableFrustrumVisual){
    constructFrustum();
  }else{
    Orthohelper.visible = false;
    Perspechelper.visible = false;
  }
};
let video;
function handleVideoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Create object URL for video
  const url = URL.createObjectURL(file);

  // Create video element
  video = document.createElement('video');
  video.src = url;
  video.crossOrigin = 'anonymous';
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.play();
  videoPlayerObject.setSource(video.src);
}

//  function readRenderTargetPosition() {
//  // var gl = THREE.WebGLRenderer;
//   //v/ar pixels = new Uint8Array(1920*1080*4);
//  // gl.readRenderTargetPixels(renderTarget,0.5,0.5,1920,1080,pixels);
//   renderer.clear();
//   renderer.setRenderTarget(renderTarget);
//   renderer.render(scene,camera);
//   renderer.setRenderTarget( null )
//   renderer.render( scene, camera )

//   var readBuffer = new Float32Array(4);
//   renderer.readRenderTargetPixels(renderTarget,0,0,1,1,readBuffer);
//   console.log('----------------------');
//   console.log(readBuffer[0]);
//   console.log(readBuffer[1]);
//   console.log(readBuffer[2]);
//   console.log(readBuffer[3]);
//   console.log('----------------------');
// }
const ColorTileRadix = 3;
const ColorTileLen = 2;
const tilePow = Math.pow( ColorTileRadix, ColorTileLen * 3);
async function teleport(){
  var posx = 0;
  var posy = 0;
  var posz = 0;
  const xhi = DecodeVideoSnorm(readslot(0));
  const xlo = DecodeVideoSnorm(readslot(3));
  posx = DecodeVideoFloat(xhi,xlo)*2.0;
  const yhi = DecodeVideoSnorm(readslot(1));
  const ylo = DecodeVideoSnorm(readslot(4));
  posy = DecodeVideoFloat(yhi,ylo)*2.0;
  const zhi = DecodeVideoSnorm(readslot(2));
  const zlo = DecodeVideoSnorm(readslot(5));
  posz = DecodeVideoFloat(zhi,zlo)*2.0;
  controls.target.set(posx,posy,-posz);
  camera.position.set(posx+1,posy+1,-posz+1);

  
  
  //camera.quaternion.set(q.x, q.y, q.z, q.w);
  //controls.enableRotate = false;
  controls.update();
  
  
  camera.updateProjectionMatrix();
}
function constructFrustum(){
  var posx = 0;
  var posy = 0;
  var posz = 0;
  const xhi = DecodeVideoSnorm(readslot(0));
  const xlo = DecodeVideoSnorm(readslot(3));
  posx = DecodeVideoFloat(xhi,xlo)*2.0;
  const yhi = DecodeVideoSnorm(readslot(1));
  const ylo = DecodeVideoSnorm(readslot(4));
  posy = DecodeVideoFloat(yhi,ylo)*2.0;
  const zhi = DecodeVideoSnorm(readslot(2));
  const zlo = DecodeVideoSnorm(readslot(5));
  posz = -DecodeVideoFloat(zhi,zlo)*2.0;

  var qx = 0;
  var qy = 0;
  var qz = 0;
  var qw = 0;
  qx = -DecodeVideoSnorm(readslot(6));
  console.log("qx: ",qx);
  qy = -DecodeVideoSnorm(readslot(7));
  console.log("qy: ",qy);
  qz = DecodeVideoSnorm(readslot(8));
  console.log("qz: ",qz);
  qw = DecodeVideoSnorm(readslot(9));
  console.log("qw: ",qw);

  const q = new THREE.Quaternion(qx, qy, qz, qw);
  if (q.length() > 0.0001) q.normalize();
  //camera.quaternion.copy(q);
  //camera.updateProjectionMatrix();
  //controls.update();
  //cubeMesh.quaternion.copy(q);
  var FOVSIZE = 0;
  var decodedFOVSIZEhi = 0;
  var decodedFOVSIZElo = 0;
  decodedFOVSIZEhi = DecodeVideoSnorm(readslot(10));
  decodedFOVSIZElo = DecodeVideoSnorm(readslot(11));
  FOVSIZE = DecodeVideoFloat(decodedFOVSIZEhi, decodedFOVSIZElo);

  var Near = 0;
  var Far = 0;
  var decodedNearhi = 0;
  var decodedNearlo = 0;
  decodedNearhi = DecodeVideoSnorm(readslot(12));
	decodedNearlo = DecodeVideoSnorm(readslot(13));
	
  var decodedFarhi = 0;
  var decodedFarlo = 0;
	decodedFarhi = DecodeVideoSnorm(readslot(14));
	decodedFarlo = DecodeVideoSnorm(readslot(15));

	Near = DecodeVideoFloat(decodedNearhi, decodedNearlo);
	Far = DecodeVideoFloat(decodedFarhi, decodedFarlo);

  var isOrtho = DecodeVideoSnorm(readslot(16));
  const aspect = 16 / 9;
  

  if(isOrtho>0.5){
     // Assume FOVSIZE encodes the vertical size of the ortho projection
    const halfHeight = FOVSIZE;
    const halfWidth = halfHeight * aspect;
    dummyCameraOrtho.left = -halfWidth;
    dummyCameraOrtho.right = halfWidth;
    dummyCameraOrtho.top = halfHeight;
    dummyCameraOrtho.bottom = -halfHeight;
    dummyCameraOrtho.near = Near;
    dummyCameraOrtho.far = Far;
    dummyCameraOrtho.position.set(posx,posy,posz);
    dummyCameraOrtho.quaternion.copy(q);
    
    dummyCameraOrtho.updateMatrixWorld(true);
    dummyCameraOrtho.updateProjectionMatrix();
    Perspechelper.visible = false;
    Orthohelper.visible = true;
    Orthohelper.update();
  }else{
    dummyCameraPerspec.fov = FOVSIZE;
    dummyCameraPerspec.aspect = aspect;
    dummyCameraPerspec.near = Near;
    dummyCameraPerspec.far = Far;
    dummyCameraPerspec.position.set(posx,posy,posz);
    dummyCameraPerspec.quaternion.copy(q);
    
    dummyCameraPerspec.updateMatrixWorld(true);
    dummyCameraPerspec.updateProjectionMatrix();
    Orthohelper.visible = false;
    Perspechelper.visible = true;
    Perspechelper.update();
  }

}
function readslot(slot){
  return [readPosPixel(renderer,renderTarget,0,slot),readPosPixel(renderer,renderTarget,1,slot)];
}
function readPosPixel(renderer, renderTarget,x,y){
  const { width, height } = renderTarget;
  const c = new Array(ColorTileLen);
  var readBuffer = new Float32Array(4);
    renderer.readRenderTargetPixels(
    renderTarget,
    12+24*x,            // x = left
    height - 12-24*y,   // y = top (invert because WebGL origin is bottom-left)
    1,
    1,
    readBuffer
  );
    c[0] = [
  Math.pow(readBuffer[0], 1 / 2.21183),
  Math.pow(readBuffer[1], 1 / 2.21183),
  Math.pow(readBuffer[2], 1 / 2.21183)
  ];
  return c[0];
}
// function readUpperLeftPixel(renderer, renderTarget) {
//   const { width, height } = renderTarget;
//   const c = new Array(ColorTileLen);
//   var readBuffer = new Float32Array(4);

//   // Ensure rendering has occurred before reading
//   renderer.readRenderTargetPixels(
//     renderTarget,
//     12+24*0,            // x = left
//     height - 12-24*0,   // y = top (invert because WebGL origin is bottom-left)
//     1,
//     1,
//     readBuffer
//   );
//   //console.log('render',Math.pow(readBuffer[0],(1/2.21183)),Math.pow(readBuffer[1],(1/2.21183)),Math.pow(readBuffer[2],(1/2.21183)));
//   //console.log('render',readBuffer[0],readBuffer[1],readBuffer[2]);
//   //c[0] = Math.pow(readBuffer,(1/2.21183));
//   c[0] = [
//   Math.pow(readBuffer[0], 1 / 2.21183),
//   Math.pow(readBuffer[1], 1 / 2.21183),
//   Math.pow(readBuffer[2], 1 / 2.21183)
//   ];
//   // c[0] = [
//   // readBuffer[0],
//   // readBuffer[1],
//   // readBuffer[2]
//   // ];
//     renderer.readRenderTargetPixels(
//     renderTarget,
//     12+24*1,            // x = left
//     height - 12-24*0,   // y = top (invert because WebGL origin is bottom-left)
//     1,
//     1,
//     readBuffer
//   );
//   //c[1] = Math.pow(readBuffer,(1/2.21183));
//   c[1] = [
//   Math.pow(readBuffer[0], 1 / 2.21183),
//   Math.pow(readBuffer[1], 1 / 2.21183),
//   Math.pow(readBuffer[2], 1 / 2.21183)
//   ];
//   // c[1] = [
//   // readBuffer[0],
//   // readBuffer[1],
//   // readBuffer[2]
//   // ];
//   //console.log('render',Math.pow(readBuffer[0],(1/2.21183)),Math.pow(readBuffer[1],(1/2.21183)),Math.pow(readBuffer[2],(1/2.21183)));
//   //console.log('render',readBuffer[0],readBuffer[1],readBuffer[2]);
//   //console.log('out',DecodeVideoSnorm(c));
//   let hi = DecodeVideoSnorm(c);
//   //second round of decoding
//   renderer.readRenderTargetPixels(
//     renderTarget,
//     12+24*0,            // x = left
//     height - 12-24*3,   // y = top (invert because WebGL origin is bottom-left)
//     1,
//     1,
//     readBuffer
//   );
//   //console.log('render',Math.pow(readBuffer[0],(1/2.21183)),Math.pow(readBuffer[1],(1/2.21183)),Math.pow(readBuffer[2],(1/2.21183)));
//   //console.log('render',readBuffer[0],readBuffer[1],readBuffer[2]);
//   //c[0] = Math.pow(readBuffer,(1/2.21183));
//   c[0] = [
//   Math.pow(readBuffer[0], 1 / 2.21183),
//   Math.pow(readBuffer[1], 1 / 2.21183),
//   Math.pow(readBuffer[2], 1 / 2.21183)
//   ];
//   // c[0] = [
//   // readBuffer[0],
//   // readBuffer[1],
//   // readBuffer[2]
//   // ];
//     renderer.readRenderTargetPixels(
//     renderTarget,
//     12+24*1,            // x = left
//     height - 12-24*3,   // y = top (invert because WebGL origin is bottom-left)
//     1,
//     1,
//     readBuffer
//   );
//   //c[1] = Math.pow(readBuffer,(1/2.21183));
//   c[1] = [
//   Math.pow(readBuffer[0], 1 / 2.21183),
//   Math.pow(readBuffer[1], 1 / 2.21183),
//   Math.pow(readBuffer[2], 1 / 2.21183)
//   ];
//   // c[1] = [
//   // readBuffer[0],
//   // readBuffer[1],
//   // readBuffer[2]
//   // ];
//   //console.log('render',Math.pow(readBuffer[0],(1/2.21183)),Math.pow(readBuffer[1],(1/2.21183)),Math.pow(readBuffer[2],(1/2.21183)));
//   //console.log('render',readBuffer[0],readBuffer[1],readBuffer[2]);
//   //console.log('out',DecodeVideoSnorm(c));
//   let lo = DecodeVideoSnorm(c);
//   console.log('FloatOut: ',DecodeVideoFloat(hi,lo)*2.0);
//   return readBuffer; // [R, G, B, A]
// }

// function DecodeVideoFloat(hi, lo) {
//     vec2 hilo = (tilePow - 1.0) / 2.0 +
//                 (tilePow - 1.0) / 2.0 * vec2(hi, lo);
//     vec3 state = vec3(0.0);
//     gray_encoder_add(state, hilo.x, uint(tilePow), false);
//     gray_encoder_add(state, hilo.y, uint(tilePow), true);
//     return gray_encoder_sum(vec3(state.x - (tilePow * tilePow - 1.0) / 2.0, state.yz))
//            / ((tilePow - 1.0) / 2.0);
// }
//var stateout = new Array(3);
function gray_encoder_add(state, x, radix, cont) {
    //if (int(state.x) & 1) x = float(radix - 1u) - x;
    if ((state[0] & 1) !== 0){
      x = radix - 1 - x;
    } 
    state[0]  = state[0] * radix + Math.round(x);
    //stateout[0]  = state[0] * radix + Math.round(x);
    const xr  = x - Math.round(x);
    if (cont && !(Math.round(x) === 0.0 || Math.round(x) === (radix - 1))){
        state[1] = xr;
        //stateout[1] = xr;
        state[2] = xr;
        //stateout[2] = xr;
    }
    //console.log('gray_encode_add: state', state)
        
    
}
function gray_encoder_sum(state) {
  const p = [
      Math.max(0.0, state[2] * 2.0),
      Math.max(0.0, -state[2] * 2.0),
    ];
    //vec2 p = max(vec2(0.0), state.zy * vec2(+2.0, -2.0));
    const num = Math.min(p[0], p[1]);
    //console.log('gray_encoder_sum: num', num)
    const den = Math.max(Math.max(p[0], p[1]) - p[0] * p[1], 1e-5);
    //console.log('gray_encoder_sum: den', den)
    const val = ((num / den) * (p[0] - p[1]) + (p[0] - p[1])) * 0.5 + state[0];
    //console.log('gray_encoder_sum: val', val)
    return val;
}
function DecodePositionFromSlot(c) {

    return DecodeVideoSnorm(c);
}

function DecodeVideoSnorm(c) {
    const state = [0, 0, 0];
    //stateout = state;
    for (let i = 0; i < ColorTileLen; ++i) {
        //c[i] *= ColorTileRadix - 1;
        c[i] = c[i].map(v => v * (ColorTileRadix - 1));
        gray_encoder_add(state, c[i][1], ColorTileRadix, true);
        gray_encoder_add(state, c[i][0], ColorTileRadix, true);
        gray_encoder_add(state, c[i][2], ColorTileRadix, true);
    }
    const shifted = [state[0] - (tilePow - 1) / 2, state[1], state[2]];
    //console.log('DecodeVideoSnorm: shifted', shifted)
    const value = gray_encoder_sum(shifted);
    //console.log('DecodeVideoSnorm: value', value)
    return value / ((tilePow - 1) / 2);

    //return gray_encoder_sum(vec3(state.x - (tilePow - 1.0) / 2.0, state.yz)) / ((tilePow - 1.0) / 2.0);
}
const halfTile = (tilePow - 1) / 2;
function DecodeVideoFloat(hi, lo) {
  const hilo = [halfTile * (1 + hi), halfTile * (1 + lo)];

  const state = [0, 0, 0];
  gray_encoder_add(state, hilo[0], tilePow, false);
  gray_encoder_add(state, hilo[1], tilePow, true);

  const adjusted = [
    state[0] - ((tilePow * tilePow - 1) / 2),
    state[1],
    state[2]
  ];
  return gray_encoder_sum(adjusted) / halfTile;
}


renderloop();
