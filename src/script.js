import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import gsap from 'gsap';
import firefliesVertexShader from './shaders/fireflies/vertex.glsl';
import firefliesFragmentShader from './shaders/fireflies/fragment.glsl';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

/**
 * Loaders
 */
const textureLoader = new THREE.TextureLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();

/**
 * Fireflies
 */
const firefliesGeometry = new THREE.BufferGeometry();
const firefliesCount = 1000;
const positionArray = new Float32Array(firefliesCount * 3);
const scaleArray = new Float32Array(firefliesCount);
const spreadRange = 300;

for (let i = 0; i < firefliesCount; i++) {
    positionArray[i * 3 + 0] = (Math.random() - 0.5) * spreadRange;
    positionArray[i * 3 + 1] = (Math.random() - 0.3) * spreadRange;
    positionArray[i * 3 + 2] = (Math.random() - 0.5) * spreadRange;
    scaleArray[i] = Math.random();
}

firefliesGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
firefliesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scaleArray, 1));

const firefliesMaterial = new THREE.ShaderMaterial({
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    transparent: true,
    uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSize: { value: 100 }
    },
    vertexShader: firefliesVertexShader,
    fragmentShader: firefliesFragmentShader
});

const fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial);
scene.add(fireflies);

/**
 * Environment map
 */
const environmentMap = cubeTextureLoader.load([
    '3/px.png',
    '3/nx.png',
    '3/py.png',
    '3/ny.png',
    '3/pz.png',
    '3/nz.png'
]);

scene.background = environmentMap;

// Draco loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('draco/');

// GLTF loader
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

/**
 * Texture
 */
const bakedTexture = textureLoader.load('baked.jpg');
bakedTexture.flipY = false;
bakedTexture.colorSpace = THREE.SRGBColorSpace;

const bakedTextureCloth1 = textureLoader.load('cloth1.jpg');
bakedTextureCloth1.flipY = false;
bakedTextureCloth1.colorSpace = THREE.SRGBColorSpace;

const bakedTextureCloth2 = textureLoader.load('cloth2.jpg');
bakedTextureCloth2.flipY = false;
bakedTextureCloth2.colorSpace = THREE.SRGBColorSpace;

const bakedTextureCloth3 = textureLoader.load('cloth3.jpg');
bakedTextureCloth3.flipY = false;
bakedTextureCloth3.colorSpace = THREE.SRGBColorSpace;

/**
 * Materials
 */
const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture });
const bakedMaterialCloth1 = new THREE.MeshBasicMaterial({ map: bakedTextureCloth1 });
const bakedMaterialCloth2 = new THREE.MeshBasicMaterial({ map: bakedTextureCloth2 });
const bakedMaterialCloth3 = new THREE.MeshBasicMaterial({ map: bakedTextureCloth3 });

const poleLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 });
const entityLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 });
const pathLightMaterial = new THREE.MeshBasicMaterial({ color: 0xe5ffff });
const plainClothtMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 });

/**
 * Model
 */
let mixer;
gltfLoader.load('WORKSHOP.glb', (gltf) => {
    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            child.material = bakedMaterial;
        }
    });

    scene.add(gltf.scene);

    const lightMesh = gltf.scene.children.find(child => child.name === 'LL1');
    const entityMesh = gltf.scene.children.find(child => child.name === 'CL');
    const pathMesh = gltf.scene.children.find(child => child.name === 'PL2');
    const cloth1Mesh = gltf.scene.children.find(child => child.name === 'CLOTH1');
    const cloth2Mesh = gltf.scene.children.find(child => child.name === 'CLOTH2');
    const cloth3Mesh = gltf.scene.children.find(child => child.name === 'CLOTH3');
    const set1Mesh = gltf.scene.children.find(child => child.name === 'SET1');
    const set2Mesh = gltf.scene.children.find(child => child.name === 'SET2');
    const set3Mesh = gltf.scene.children.find(child => child.name === 'SET3');

    if (lightMesh) lightMesh.material = poleLightMaterial;
    if (entityMesh) entityMesh.material = entityLightMaterial;
    if (pathMesh) pathMesh.material = pathLightMaterial;
    if (set1Mesh) set1Mesh.material = bakedMaterialCloth1;
    if (set2Mesh) set2Mesh.material = bakedMaterialCloth2;
    if (set3Mesh) set3Mesh.material = bakedMaterialCloth3;
    if (cloth1Mesh) cloth1Mesh.material = plainClothtMaterial;
    if (cloth2Mesh) cloth2Mesh.material = plainClothtMaterial;
    if (cloth3Mesh) cloth3Mesh.material = plainClothtMaterial;

    mixer = new THREE.AnimationMixer(gltf.scene);

    const clips = gltf.animations;
    clips.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat);
        action.play();
    });

    if (entityMesh) {
        controls.target.set(entityMesh.position.x + 70, entityMesh.position.y - 10, entityMesh.position.z);
    }

    const animateCamera = (x, y, z, target) => {
        gsap.to(camera.position, {
            duration: 1,
            x: x,
            y: y,
            z: z,
            onUpdate: () => {
                controls.target.set(target.x, target.y, target.z);
                controls.update();
            }
        });
    };

    window.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        const arrow = document.getElementById(`arrow-${key.replace('arrow', '')}`);
        if (arrow) {
            arrow.classList.add('pressed');
        }

        switch (event.key) {
            case 'ArrowUp':
                animateCamera(-3, 53, 50, { x: set2Mesh.position.x - 10, y: set2Mesh.position.y - 5, z: set2Mesh.position.z });
                break;
            case 'ArrowRight':
                animateCamera(9, 37, 55, { x: set1Mesh.position.x - 10, y: set1Mesh.position.y, z: set1Mesh.position.z });
                break;
            case 'ArrowLeft':
                animateCamera(10, 35, 55, { x: set3Mesh.position.x + 5, y: set3Mesh.position.y, z: set3Mesh.position.z });
                break;
            case 'ArrowDown':
                animateCamera(-60, 50, 148.19, { x: entityMesh.position.x + 70, y: entityMesh.position.y - 10, z: entityMesh.position.z });
                break;
        }
    });

    window.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();
        const arrow = document.getElementById(`arrow-${key.replace('arrow', '')}`);
        if (arrow) {
            arrow.classList.remove('pressed');
        }
    });
});

document.addEventListener('keydown', (event) => {
    const key = event.key;
    const explanationBox = document.getElementById('explanation-box');

    if (explanationBox) {
        if (key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight') {
            explanationBox.style.display = 'none';
        } else if (key === 'ArrowDown') {
            explanationBox.style.display = 'block';
        }
    }
});

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    firefliesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
});

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(-60, 50, 148.19);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.xr.enabled = true;

document.body.appendChild(VRButton.createButton(renderer));

const exitVRButton = document.createElement('button');
exitVRButton.className = 'exit-vr-button';
exitVRButton.innerText = 'Exit VR';
exitVRButton.style.display = 'none';

exitVRButton.onclick = () => {
    if (renderer.xr.isPresenting) {
        renderer.xr.getSession().end();
    }
};

document.body.appendChild(exitVRButton);

renderer.xr.addEventListener('sessionstart', () => {
    exitVRButton.style.display = 'block';
});

renderer.xr.addEventListener('sessionend', () => {
    exitVRButton.style.display = 'none';
});

/**
 * VR Controllers
 */
function onSelectStart(event) {
    const controller = event.target;
    const intersections = getIntersections(controller);

    if (intersections.length > 0) {
        const intersection = intersections[0];
        const object = intersection.object;
        object.material.emissive.b = 1;
        controller.userData.selected = object;
    }
}

function onSelectEnd(event) {
    const controller = event.target;

    if (controller.userData.selected !== undefined) {
        const object = controller.userData.selected;
        object.material.emissive.b = 0;
        controller.userData.selected = undefined;
    }
}

function getIntersections(controller) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);

    const raycaster = new THREE.Raycaster();
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    return raycaster.intersectObjects(scene.children, false);
}

const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);

controller1.addEventListener('selectstart', onSelectStart);
controller1.addEventListener('selectend', onSelectEnd);
controller2.addEventListener('selectstart', onSelectStart);
controller2.addEventListener('selectend', onSelectEnd);

scene.add(controller1);
scene.add(controller2);

const controllerModelFactory = new XRControllerModelFactory();

const controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
scene.add(controllerGrip1);

const controllerGrip2 = renderer.xr.getControllerGrip(1);
controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
scene.add(controllerGrip2);

// Define movement variables
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;
let zoomIn = false;
let zoomOut = false;

function onSqueezeStart(event) {
    const controller = event.target;
    controller.userData.isSqueezing = true;
}

function onSqueezeEnd(event) {
    const controller = event.target;
    controller.userData.isSqueezing = false;
}

function handleController(controller) {
    if (controller.userData.isSelecting) {
        const delta = 0.1; // Adjust this value to control the speed of movement
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(controller.quaternion);
        camera.position.add(direction.multiplyScalar(delta));
    }
    if (controller.userData.isSqueezing) {
        const delta = 0.1; // Adjust this value to control the speed of movement
        const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(controller.quaternion);
        camera.position.add(direction.multiplyScalar(delta));
    }
}

function handleJoystickMovement(controller) {
    const gamepad = controller.userData.gamepad;
    if (!gamepad) return;

    const [x, y] = gamepad.axes;

    moveForward = y < -0.1;
    moveBackward = y > 0.1;
    moveLeft = x < -0.1;
    moveRight = x > 0.1;

    // Handle zoom in and out with the primary buttons
    zoomIn = gamepad.buttons[0].pressed;
    zoomOut = gamepad.buttons[1].pressed;

    // Handle move up and down with secondary buttons
    moveUp = gamepad.buttons[3].pressed;
    moveDown = gamepad.buttons[4].pressed;
}

function applyMovement(delta) {
    const moveSpeed = 5 * delta;
    const zoomSpeed = 2 * delta;
    const moveVector = new THREE.Vector3();

    if (moveForward) moveVector.z -= moveSpeed;
    if (moveBackward) moveVector.z += moveSpeed;
    if (moveLeft) moveVector.x -= moveSpeed;
    if (moveRight) moveVector.x += moveSpeed;
    if (moveUp) moveVector.y += moveSpeed;
    if (moveDown) moveVector.y -= moveSpeed;

    camera.position.add(moveVector.applyQuaternion(camera.quaternion));

    if (zoomIn) {
        camera.position.add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(zoomSpeed));
    }
    if (zoomOut) {
        camera.position.add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(-zoomSpeed));
    }
}

controller1.addEventListener('connected', (event) => {
    const controller = event.target;
    controller.userData.handedness = event.data.handedness;
    controller.userData.gamepad = event.data.gamepad;
    controller.userData.isSelecting = false;
    controller.userData.isSqueezing = false;
});

controller2.addEventListener('connected', (event) => {
    const controller = event.target;
    controller.userData.handedness = event.data.handedness;
    controller.userData.gamepad = event.data.gamepad;
    controller.userData.isSelecting = false;
    controller.userData.isSqueezing = false;
});

controller1.addEventListener('disconnected', (event) => {
    delete event.target.userData.gamepad;
});

controller2.addEventListener('disconnected', (event) => {
    delete event.target.userData.gamepad;
});

// Update tick function to handle movement
const tick = () => {
    const delta = clock.getDelta();

    controls.update();

    firefliesMaterial.uniforms.uTime.value += delta;

    if (mixer) {
        mixer.update(delta);
    }

    handleController(controller1);
    handleController(controller2);
    handleJoystickMovement(controller1);
    handleJoystickMovement(controller2);
    applyMovement(delta);

    renderer.render(scene, camera);

    renderer.setAnimationLoop(tick);
};

tick();
