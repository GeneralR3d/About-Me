import * as THREE from 'three'

export default class Shrub {
    constructor(scene, options = {}) {
        this.scene = scene
        this.position = options.position || { x: 0, y: 0, z: 0 }

        this.mesh = new THREE.Group()
        this.mesh.position.set(this.position.x, this.position.y, this.position.z)

        // Randomize scale
        const scale = 0.5 + Math.random() * 0.5
        this.mesh.scale.set(scale, scale, scale)

        // Random rotation
        this.mesh.rotation.y = Math.random() * Math.PI * 2

        this.createBody()

        this.scene.add(this.mesh)
    }

    createBody() {
        // Dry/Dead bush colors
        const colors = ['#8d6e63', '#a1887f', '#5d4037', '#6d4c41']
        const color = colors[Math.floor(Math.random() * colors.length)]

        const material = new THREE.MeshStandardMaterial({
            color: color,
            flatShading: true,
            roughness: 1.0
        })

        // Just a bunch of small spheres/dodecahedrons clumping together
        const count = 3 + Math.floor(Math.random() * 4)

        for (let i = 0; i < count; i++) {
            const size = 0.2 + Math.random() * 0.3
            const geo = new THREE.DodecahedronGeometry(size)
            const mesh = new THREE.Mesh(geo, material)

            mesh.position.set(
                (Math.random() - 0.5) * 0.6,
                size * 0.5 + Math.random() * 0.3,
                (Math.random() - 0.5) * 0.6
            )

            mesh.castShadow = true
            mesh.receiveShadow = true
            this.mesh.add(mesh)
        }
    }
}
