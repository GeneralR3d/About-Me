import * as THREE from 'three'
import Map from './World/Map.js'
import Character from './World/Character.js'
import ContactCubes from './World/ContactCubes.js'
import Physics from './Utils/Physics.js'

export default class Game {
    constructor(canvas) {
        this.canvas = canvas
        this.width = window.innerWidth
        this.height = window.innerHeight
        this.pixelRatio = Math.min(window.devicePixelRatio, 2)

        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color('#87CEEB') // Sky Blue



        // Camera
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100)
        this.camera.position.set(6, 6, 8)
        this.scene.add(this.camera)

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        })
        this.renderer.setSize(this.width, this.height)
        this.renderer.setPixelRatio(this.pixelRatio)
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

        // Lights
        this.setLights()

        // Physics & World
        this.physics = new Physics(this)

        // Wait for ammo
        // Wait for ammo
        let retries = 0
        const initInterval = setInterval(() => {
            if (this.physics.physicsWorld) {
                clearInterval(initInterval)
                this.initWorld()
            } else {
                retries++
                if (retries > 20) { // 2 seconds
                    console.error("Physics init timed out or failed. Starting without physics.")
                    clearInterval(initInterval)
                    this.initWorld()
                }
            }
        }, 100)

        // Resize
        window.addEventListener('resize', () => this.resize())

        // Loop
        this.clock = new THREE.Clock()
        // Camera State
        this.cameraAngle = Math.PI / 4
        this.cameraVerticalAngle = 0.5 // Radians above horizon
        this.cameraRadius = 20
        this.isDragging = false
        this.previousMousePosition = { x: 0, y: 0 }

        // Input
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true
            this.previousMousePosition = { x: e.clientX, y: e.clientY }
        })

        window.addEventListener('mouseup', () => {
            this.isDragging = false
        })

        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.previousMousePosition.x
                const deltaY = e.clientY - this.previousMousePosition.y

                this.cameraAngle -= deltaX * 0.005
                this.cameraVerticalAngle += deltaY * 0.005

                // Clamp Vertical
                // Allow negative angle (looking up from below)
                this.cameraVerticalAngle = Math.max(0, Math.min(Math.PI / 2 - 0.1, this.cameraVerticalAngle))

                this.previousMousePosition = { x: e.clientX, y: e.clientY }
            }

            // Cursor Hover Logic
            if (this.raycaster && this.camera) {
                this.mouse.x = (e.clientX / this.width) * 2 - 1
                this.mouse.y = -(e.clientY / this.height) * 2 + 1

                this.raycaster.setFromCamera(this.mouse, this.camera)
                const intersects = this.raycaster.intersectObjects(this.scene.children, true)

                let found = false
                for (let i = 0; i < intersects.length; i++) {
                    const object = intersects[i].object
                    if (object.userData && object.userData.parent) {
                        if (typeof object.userData.parent.onClick === 'function' ||
                            typeof object.userData.parent.explode === 'function') {
                            found = true
                            break
                        }
                    }
                }
                this.canvas.style.cursor = found ? 'pointer' : 'auto'
            }
        })

        // Initialize Raycaster
        this.raycaster = new THREE.Raycaster()
        this.mouse = new THREE.Vector2()

        this.canvas.addEventListener('click', (e) => {
            // Calculate mouse position in normalized device coordinates
            this.mouse.x = (e.clientX / this.width) * 2 - 1
            this.mouse.y = -(e.clientY / this.height) * 2 + 1

            this.raycaster.setFromCamera(this.mouse, this.camera)

            const intersects = this.raycaster.intersectObjects(this.scene.children, true)

            for (let i = 0; i < intersects.length; i++) {
                const object = intersects[i].object

                if (object.userData && object.userData.parent) {
                    if (typeof object.userData.parent.onClick === 'function') {
                        object.userData.parent.onClick(object)
                        break
                    }
                    if (typeof object.userData.parent.explode === 'function') {
                        object.userData.parent.explode()
                        break
                    }
                }
            }
        })

        // Audio
        this.initAudio()
    }

    initAudio() {
        this.backgroundMusic = new Audio('music/trimmed_music.m4a')
        this.backgroundMusic.loop = true
        this.backgroundMusic.volume = 0.4

        const playPromise = this.backgroundMusic.play()
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                console.log("Autoplay prevented. Waiting for interaction to play music.")
                const startAudio = () => {
                    this.backgroundMusic.play()
                    window.removeEventListener('click', startAudio)
                    window.removeEventListener('keydown', startAudio)
                    window.removeEventListener('touchstart', startAudio)
                }
                window.addEventListener('click', startAudio)
                window.addEventListener('keydown', startAudio)
                window.addEventListener('touchstart', startAudio)
            })
        }
    }

    initWorld() {
        this.map = new Map(this)
        this.character = new Character(this)
        this.contactCubes = new ContactCubes(this)
        this.tick()
    }

    setLights() {
        this.ambientLight = new THREE.AmbientLight('#ffffff', 0.6)
        this.scene.add(this.ambientLight)

        this.directionalLight = new THREE.DirectionalLight('#ffaa00', 1.5)
        this.directionalLight.position.set(10, 10, 50)
        this.directionalLight.castShadow = true
        this.directionalLight.shadow.camera.near = 0.1
        this.directionalLight.shadow.camera.far = 100
        this.directionalLight.shadow.camera.left = -30
        this.directionalLight.shadow.camera.right = 30
        this.directionalLight.shadow.camera.top = 30
        this.directionalLight.shadow.camera.bottom = -30
        this.directionalLight.shadow.mapSize.set(2048, 2048)
        this.scene.add(this.directionalLight)
    }

    resize() {
        this.width = window.innerWidth
        this.height = window.innerHeight

        this.camera.aspect = this.width / this.height
        this.camera.updateProjectionMatrix()

        this.renderer.setSize(this.width, this.height)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }

    tick() {
        const elapsedTime = this.clock.getElapsedTime()
        let deltaTime = this.clock.getDelta()

        // Prevent zero delta (can happen if frame is super fast or clock weirdness)
        // If 0, assume 60fps frame
        if (deltaTime === 0) {
            deltaTime = 1 / 60
        }
        // Cap max delta to prevent explosion on lag spikes
        if (deltaTime > 0.1) deltaTime = 0.1

        // Update Physics
        if (this.physics) this.physics.update(deltaTime)

        // Update World
        if (this.character) this.character.update()
        if (this.map) this.map.update()

        // Camera Follow (Orbit)
        if (this.character && this.character.mesh) {
            const centerX = this.character.mesh.position.x
            const centerY = this.character.mesh.position.y + 1 // Look at head/torso
            const centerZ = this.character.mesh.position.z

            // Spherical to Cartesian
            // y is up
            const x = centerX + this.cameraRadius * Math.sin(this.cameraAngle) * Math.cos(this.cameraVerticalAngle)
            const z = centerZ + this.cameraRadius * Math.cos(this.cameraAngle) * Math.cos(this.cameraVerticalAngle)
            const y = centerY + this.cameraRadius * Math.sin(this.cameraVerticalAngle)

            this.camera.position.set(x, y, z)
            this.camera.lookAt(centerX, centerY, centerZ)
        }

        this.renderer.render(this.scene, this.camera)
        window.requestAnimationFrame(() => this.tick())
    }
}
