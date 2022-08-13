import './style.css'
import * as THREE from 'three'
import Stats from 'stats.js'
import { GUI } from 'lil-gui'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

/**
 * Base
 */

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Debug
const debug = new GUI()

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
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(55, sizes.width / sizes.height, 1, 20000)
camera.position.x = 30
camera.position.y = 30
camera.position.z = 100
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.maxPolarAngle = Math.PI * 0.495
controls.target.set(0, 10, 0)
controls.minDistance = 40.0
controls.maxDistance = 200.0
controls.enableDamping = true

/**
 * Consume
 */
const consume = {}
consume.sun = new THREE.Vector3()

// Water Geometry
consume.waterGeometry = new THREE.PlaneGeometry(20000, 20000)

// Water Material
consume.water = new Water(
  consume.waterGeometry,
  {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load('./assets/water-normals.jpg', (texture) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    }),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 3.7,
    fog: scene.fog !== undefined
  }
)

consume.water.rotation.x = - Math.PI / 2
scene.add(consume.water)

// Sky
consume.sky = new Sky()
consume.sky.scale.setScalar(10000)
scene.add(consume.sky)

const skyUniforms = consume.sky.material.uniforms

skyUniforms['turbidity'].value = 10
skyUniforms['rayleigh'].value = 2
skyUniforms['mieCoefficient'].value = 0.005
skyUniforms['mieDirectionalG'].value = 0.8

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
})

renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Stats
const stats = new Stats()

const parameters = {
  elevation: 0.5,
  azimuth: 180
}

const pmremGenerator = new THREE.PMREMGenerator(renderer)
let renderTargets

const updateSun = () => {
  const phi = THREE.MathUtils.degToRad(90 - parameters.elevation)
  const theta = THREE.MathUtils.degToRad(parameters.azimuth)

  consume.sun.setFromSphericalCoords(1, phi, theta)

  consume.sky.material.uniforms['sunPosition'].value.copy(consume.sun)
  consume.water.material.uniforms['sunDirection'].value.copy(consume.sun).normalize()

  if (renderTargets !== undefined) renderTargets.dispose()
  renderTargets = pmremGenerator.fromScene(consume.sky)
  scene.environment = renderTargets.texture
}

updateSun()

const folderSky = debug.addFolder('Sky')
folderSky.add(parameters, 'elevation', 0, 90, 0.1).onChange(updateSun)
folderSky.add(parameters, 'azimuth', - 180, 180, 0.1).onChange(updateSun)
folderSky.open()

/**
 * Animate
 */
const clock = new THREE.Clock()
let lastElapsedTime = 0

const tick = () => {
  const elapsedTime = clock.getElapsedTime()
  const deltaTime = elapsedTime - lastElapsedTime
  lastElapsedTime = elapsedTime

  // Update Consume
  consume.water.material.uniforms['time'].value += 0.5 / 60.0

  // Update controls
  controls.update()

  // Stats Update
  stats.update()

  // Render
  renderer.render(scene, camera)

  // Call tick again on the next frame
  window.requestAnimationFrame(tick)
}

tick()