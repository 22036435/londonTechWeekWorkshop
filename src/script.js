import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'
import gsap from 'gsap'
import firefliesVertexShader from './shaders/fireflies/vertex.glsl'
import firefliesFragmentShader from './shaders/fireflies/fragment.glsl'
// import GUI from 'lil-gui'

/**
 * Base
 */

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()

/**
 * Fireflies
 */
// Geometry
const firefliesGeometry = new THREE.BufferGeometry()
const firefliesCount = 1000
const positionArray = new Float32Array(firefliesCount * 3)
const scaleArray = new Float32Array(firefliesCount)

// Increase the spread area by changing the range of random values
const spreadRange = 300 // Adjust this value to control the spread area

for (let i = 0; i < firefliesCount; i++) {
    positionArray[i * 3 + 0] = (Math.random() - 0.5) * spreadRange // X position
    positionArray[i * 3 + 1] = (Math.random() - 0.3) * spreadRange // Y position
    positionArray[i * 3 + 2] = (Math.random() - 0.5) * spreadRange // Z position
    scaleArray[i] = Math.random()
}

firefliesGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3))
firefliesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scaleArray, 1))

// Material
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
})

// Points
const fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial)
scene.add(fireflies)

/**
 * Environment map
 */
// LDR cube texture
const environmentMap = cubeTextureLoader.load([
    '3/px.png',
    '3/nx.png',
    '3/py.png',
    '3/ny.png',
    '3/pz.png',
    '3/nz.png'
])

scene.background = environmentMap

// Draco loader
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('draco/')

// GLTF loader
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Texture
 */

const bakedTexture = textureLoader.load('baked.jpg')
bakedTexture.flipY = false
bakedTexture.colorSpace = THREE.SRGBColorSpace

const bakedTextureCloth1 = textureLoader.load('cloth1.jpg')
bakedTextureCloth1.flipY = false
bakedTextureCloth1.colorSpace = THREE.SRGBColorSpace

const bakedTextureCloth2 = textureLoader.load('cloth2.jpg')
bakedTextureCloth2.flipY = false
bakedTextureCloth2.colorSpace = THREE.SRGBColorSpace

const bakedTextureCloth3 = textureLoader.load('cloth3.jpg')
bakedTextureCloth3.flipY = false
bakedTextureCloth3.colorSpace = THREE.SRGBColorSpace

/**
 * Materials
 */
const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture })
const bakedMaterialCloth1 = new THREE.MeshBasicMaterial({ map: bakedTextureCloth1 })
const bakedMaterialCloth2 = new THREE.MeshBasicMaterial({ map: bakedTextureCloth2 })
const bakedMaterialCloth3 = new THREE.MeshBasicMaterial({ map: bakedTextureCloth3 })

// Emissive light material
const poleLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 })
const entityLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 })
const pathLightMaterial = new THREE.MeshBasicMaterial({ color: 0xe5ffff })
const plainClothtMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 })

/**
 * Model
 */
let mixer
gltfLoader.load(
    'WORKSHOP.glb',
    (gltf) => {
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                child.material = bakedMaterial
            }
        })

        scene.add(gltf.scene)

        const lightMesh = gltf.scene.children.find(child => child.name === 'LL1')
        const entityMesh = gltf.scene.children.find(child => child.name === 'CL')
        const pathMesh = gltf.scene.children.find(child => child.name === 'PL2')
        const cloth1Mesh = gltf.scene.children.find(child => child.name === 'CLOTH1')
        const cloth2Mesh = gltf.scene.children.find(child => child.name === 'CLOTH2')
        const cloth3Mesh = gltf.scene.children.find(child => child.name === 'CLOTH3')
        const set1Mesh = gltf.scene.children.find(child => child.name === 'SET1')
        const set2Mesh = gltf.scene.children.find(child => child.name === 'SET2')
        const set3Mesh = gltf.scene.children.find(child => child.name === 'SET3')

        if (lightMesh) lightMesh.material = poleLightMaterial
        if (entityMesh) entityMesh.material = entityLightMaterial
        if (pathMesh) pathMesh.material = pathLightMaterial
        if (set1Mesh) set1Mesh.material = bakedMaterialCloth1
        if (set2Mesh) set2Mesh.material = bakedMaterialCloth2
        if (set3Mesh) set3Mesh.material = bakedMaterialCloth3
        if (cloth1Mesh) cloth1Mesh.material = plainClothtMaterial
        if (cloth2Mesh) cloth2Mesh.material = plainClothtMaterial
        if (cloth3Mesh) cloth3Mesh.material = plainClothtMaterial

        mixer = new THREE.AnimationMixer(gltf.scene)

        // Debug: Log available animations
        // console.log('Available animations:', gltf.animations.map(anim => anim.name))

        const clips = gltf.animations
        clips.forEach((clip) => {
            const action = mixer.clipAction(clip)
            action.setLoop(THREE.LoopRepeat) // Set the animation to loop
            action.play()
        })

        if (entityMesh) {
            controls.target.set(entityMesh.position.x + 70, entityMesh.position.y - 10, entityMesh.position.z)
        }

        const animateCamera = (x, y, z, target) => {
            gsap.to(camera.position, {
                duration: 1,
                x: x,
                y: y,
                z: z,
                onUpdate: () => {
                    controls.target.set(target.x, target.y, target.z)
                    controls.update()
                }
            })
        }

        window.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase()
            const arrow = document.getElementById(`arrow-${key.replace('arrow', '')}`)
            if (arrow) {
                arrow.classList.add('pressed')
            }

            switch (event.key) {
                case 'ArrowUp':
                    animateCamera(-3, 53, 50, { x: set2Mesh.position.x - 10, y: set2Mesh.position.y - 5, z: set2Mesh.position.z })
                    break
                case 'ArrowRight':
                    animateCamera(9, 37, 55, { x: set1Mesh.position.x - 10, y: set1Mesh.position.y, z: set1Mesh.position.z })
                    break
                case 'ArrowLeft':
                    animateCamera(10, 35, 55, { x: set3Mesh.position.x + 5, y: set3Mesh.position.y, z: set3Mesh.position.z })
                    break
                case 'ArrowDown':
                    animateCamera(-60, 50, 148.19, { x: entityMesh.position.x + 70, y: entityMesh.position.y - 10, z: entityMesh.position.z })
                    break
            }
        })

        window.addEventListener('keyup', (event) => {
            const key = event.key.toLowerCase()
            const arrow = document.getElementById(`arrow-${key.replace('arrow', '')}`)
            if (arrow) {
                arrow.classList.remove('pressed')
            }
        })
    }
)

document.addEventListener('keydown', (event) => {
    const key = event.key
    const explanationBox = document.getElementById('explanation-box')

    if (explanationBox) {
        if (key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight') {
            explanationBox.style.display = 'none' // Hide the explanation box
        } else if (key === 'ArrowDown') {
            explanationBox.style.display = 'block' // Show the explanation box
        }
    }
})

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Update fireflies
    firefliesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 1000)
camera.position.set(-60, 50, 148.19)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 4))

document.body.appendChild(VRButton.createButton(renderer)) // Add the VRButton to the document

// Custom button to exit VR
const exitVRButton = document.createElement('button')
exitVRButton.className = 'exit-vr-button'
exitVRButton.innerText = 'Exit VR'
exitVRButton.style.display = 'none' // Hide the button initially

exitVRButton.onclick = () => {
    if (renderer.xr.isPresenting) {
        renderer.xr.getSession().end()
    }
}

document.body.appendChild(exitVRButton)


// Show the exit button when entering VR
renderer.xr.addEventListener('sessionstart', () => {
    exitVRButton.style.display = 'block'
})

// Hide the exit button when exiting VR
renderer.xr.addEventListener('sessionend', () => {
    exitVRButton.style.display = 'none'
})

renderer.xr.enabled = true // Enable WebXR on the renderer

/**
 * VR Controller Movement
 */
const controller1 = renderer.xr.getController(0)
const controller2 = renderer.xr.getController(1)
scene.add(controller1)
scene.add(controller2)

const tempMatrix = new THREE.Matrix4()

function handleController(controller) {
    if (controller.userData.isSelecting) {
        const userData = controller.userData
        const delta = 0.1 // Adjust this value to control the speed of movement

        tempMatrix.identity().extractRotation(controller.matrixWorld)

        const direction = new THREE.Vector3(0, 0, -1)
        direction.applyMatrix4(tempMatrix)
        direction.multiplyScalar(delta)

        camera.position.add(direction)
    }
}

controller1.addEventListener('selectstart', () => {
    controller1.userData.isSelecting = true
})

controller1.addEventListener('selectend', () => {
    controller1.userData.isSelecting = false
})

controller2.addEventListener('selectstart', () => {
    controller2.userData.isSelecting = true
})

controller2.addEventListener('selectend', () => {
    controller2.userData.isSelecting = false
})

/**
 * VR Controller Joystick Movement
 */
let moveForward = false
let moveBackward = false
let moveLeft = false
let moveRight = false
let moveUp = false
let moveDown = false
let zoomIn = false
let zoomOut = false

const joystickThreshold = 0.1

renderer.xr.addEventListener('squeezestart', (event) => {
    event.target.userData.isSqueezing = true
})

renderer.xr.addEventListener('squeezeend', (event) => {
    event.target.userData.isSqueezing = false
})

renderer.xr.addEventListener('selectstart', (event) => {
    event.target.userData.isSelecting = true
})

renderer.xr.addEventListener('selectend', (event) => {
    event.target.userData.isSelecting = false
})

controller1.addEventListener('connected', (event) => {
    event.target.userData.handedness = event.data.handedness
    event.target.userData.gamepad = event.data.gamepad
    event.target.userData.isSelecting = false
    event.target.userData.isSqueezing = false
})

controller2.addEventListener('connected', (event) => {
    event.target.userData.handedness = event.data.handedness
    event.target.userData.gamepad = event.data.gamepad
    event.target.userData.isSelecting = false
    event.target.userData.isSqueezing = false
})

function handleJoystickMovement(controller) {
    const gamepad = controller.userData.gamepad
    if (!gamepad) return

    const [x, y] = gamepad.axes

    moveForward = y < -joystickThreshold
    moveBackward = y > joystickThreshold
    moveLeft = x < -joystickThreshold
    moveRight = x > joystickThreshold

    if (gamepad.buttons[0].pressed) {
        moveUp = true
    } else if (gamepad.buttons[1].pressed) {
        moveDown = true
    } else {
        moveUp = false
        moveDown = false
    }

    if (gamepad.buttons[3].pressed) {
        zoomIn = true
    } else if (gamepad.buttons[4].pressed) {
        zoomOut = true
    } else {
        zoomIn = false
        zoomOut = false
    }
}

function applyMovement(delta) {
    const moveSpeed = 5 * delta
    const zoomSpeed = 2 * delta

    const moveVector = new THREE.Vector3()
    if (moveForward) moveVector.z -= moveSpeed
    if (moveBackward) moveVector.z += moveSpeed
    if (moveLeft) moveVector.x -= moveSpeed
    if (moveRight) moveVector.x += moveSpeed
    if (moveUp) moveVector.y += moveSpeed
    if (moveDown) moveVector.y -= moveSpeed
    if (zoomIn) camera.position.addScalar(-zoomSpeed)
    if (zoomOut) camera.position.addScalar(zoomSpeed)

    moveVector.applyQuaternion(camera.quaternion)
    camera.position.add(moveVector)
}

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () => {
    const delta = clock.getDelta()

    // Update controls
    controls.update()

    // Update materials
    firefliesMaterial.uniforms.uTime.value += delta

    // Update mixer if initialized
    if (mixer) {
        mixer.update(delta)
    }

    // Handle controller input for movement
    handleController(controller1)
    handleController(controller2)

    // Handle joystick movement
    handleJoystickMovement(controller1)
    handleJoystickMovement(controller2)

    // Apply movement
    applyMovement(delta)

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    renderer.setAnimationLoop(tick) // Use setAnimationLoop for VR compatibility
}

tick()

// Helper function to apply animations to VR camera
const animateVRCamera = (x, y, z, target) => {
    gsap.to(camera.position, {
        duration: 1,
        x: x,
        y: y,
        z: z,
        onUpdate: () => {
            controls.target.set(target.x, target.y, target.z)
            controls.update()
        }
    })
}
