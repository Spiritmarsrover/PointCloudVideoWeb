
import * as THREE from 'three';

//import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';


function Element(id, x, y, z, ry) {

    const div = document.createElement('div');
    div.style.width = '1920px';
    div.style.height = '1080px';
    div.style.backgroundColor = '#000';

    const iframe = document.createElement('iframe');
    iframe.style.width = '1920px';
    iframe.style.height = '1080px';
    iframe.style.border = '0px';
    iframe.src = 'https://c.hiina.space/NAanimeCM1.mp4';
    div.appendChild(iframe);

    const object = new CSS3DObject(div);
    object.position.set(x, y, z);
    object.rotation.y = ry;
    object.scale.set(.01, .01, .01);

    return object;

}

//init();

const scene = new THREE.Scene();

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshBasicMaterial({ color: "red" });
//const cubeMaterial = new THREE.MeshStandardMaterial();

const cubeMesh = new THREE.Mesh(
    cubeGeometry,
    cubeMaterial
);
scene.add(cubeMesh)
//cubeMesh.position.set(1, 1, 1);

const light = new THREE.AmbientLight(0xffffff, .1);
scene.add(light);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth/window.innerHeight,
    0.1,
    30
);
camera.position.z = 5


const canvas = document.querySelector('canvas.threejs')
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
});

renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const group = new THREE.Group();
group.add(new Element('SJOz3qjfQXU', 0, 0, 0, Math.PI / 2));
scene.add(group);

renderer.setSize(window.innerWidth, window.innerHeight);
const maxPixelRatio = Math.min(window.devicePixelRatio,2);
renderer.setPixelRatio(maxPixelRatio);

const controls = new OrbitControls(camera,canvas);
controls.enableDamping = true;


//animate();

function init() {

    // const container = document.getElementById('container');

    // camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, .1, 30);
    // camera.position.set(15, 0, 0);

    // scene = new THREE.Scene();





    // // controls = new TrackballControls(camera, renderer.domElement);
    // // controls.rotateSpeed = 4;

    // controls = new OrbitControls(camera, canvas);
    // controls.enableDamping = true;

    // //window.addEventListener('resize', onWindowResize);

    // // Block iframe events when dragging camera

    // const blocker = document.getElementById('blocker');
    // blocker.style.display = 'none';

    // controls.addEventListener('start', function () {

    //     blocker.style.display = '';

    // });
    // controls.addEventListener('end', function () {

    //     blocker.style.display = 'none';

    // });

}

// function onWindowResize() {

//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();
//     renderer.setSize(window.innerWidth, window.innerHeight);

// }

// function animate() {

//     //requestAnimationFrame(animate);
//     //controls.update();
//     renderer.render(scene, camera);

// }

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
})

const renderloop = () => {
    controls.update(); renderer.render(scene, camera);
    window.requestAnimationFrame(renderloop);
};

renderloop();