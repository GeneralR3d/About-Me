import * as THREE from 'three'

export default class Redwood {
    constructor(scene, options = {}) {
        this.scene = scene
        this.position = options.position || { x: 0, y: 0, z: 0 }

        this.mesh = new THREE.Group()
        this.mesh.position.set(this.position.x, this.position.y, this.position.z)

        // Randomize scale - Redwoods are HUGE
        // Base scale 2.0 to 3.5
        const scale = 2.0 + Math.random() * 1.5
        this.mesh.scale.set(scale, scale, scale)

        this.createTrunk()
        this.createFoliage()

        this.scene.add(this.mesh)
    }

    createTrunk() {
        // Tall, thick reddish-brown trunk
        const height = 5.0 + Math.random() * 2.0
        const radiusBottom = 0.5
        const radiusTop = 0.3

        const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 8)
        const material = new THREE.MeshStandardMaterial({
            color: '#5D4037', // Reddish Brown
            roughness: 0.9,
            flatShading: true
        })

        const trunk = new THREE.Mesh(geometry, material)
        trunk.position.y = height / 2
        trunk.castShadow = true
        trunk.receiveShadow = true
        this.mesh.add(trunk)

        this.trunkHeight = height
    }

    createFoliage() {
        const material = new THREE.MeshStandardMaterial({
            color: '#2E7D32', // Lush Green
            flatShading: true,
            roughness: 0.8
        })

        // Conical layers of foliage starting from halfway up
        const layers = 5
        const startY = this.trunkHeight * 0.4
        const totalFoliageHeight = this.trunkHeight * 0.8

        for (let i = 0; i < layers; i++) {
            const t = i / layers
            const layerY = startY + t * totalFoliageHeight

            // Cone size decreases as we go up
            const radius = 1.5 * (1 - t * 0.6)
            const height = 1.5

            const geo = new THREE.ConeGeometry(radius, height, 8)
            const mesh = new THREE.Mesh(geo, material)

            mesh.position.y = layerY
            mesh.castShadow = true
            mesh.receiveShadow = true
            this.mesh.add(mesh)
        }
    }
}
