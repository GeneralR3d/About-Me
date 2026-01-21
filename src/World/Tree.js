import * as THREE from 'three'

export default class Tree {
    constructor(scene, options = {}) {
        this.scene = scene
        this.position = options.position || { x: 0, y: 0, z: 0 }

        this.mesh = new THREE.Group()
        this.mesh.position.set(this.position.x, this.position.y, this.position.z)

        // Randomize scale
        const scale = 0.8 + Math.random() * 0.6
        this.mesh.scale.set(scale, scale, scale)

        this.createTrunk()
        this.createFoliage()

        this.scene.add(this.mesh)
    }

    createTrunk() {
        const geometry = new THREE.CylinderGeometry(0.2, 0.4, 1.5, 5)
        const material = new THREE.MeshStandardMaterial({
            color: '#4a2f1b', // Dark brown
            flatShading: true
        })
        const trunk = new THREE.Mesh(geometry, material)
        trunk.position.y = 0.75
        trunk.castShadow = true
        trunk.receiveShadow = true
        this.mesh.add(trunk)
    }

    createFoliage() {
        const colors = ['#e65100', '#f57c00', '#ffb74d', '#ff5722'] // Autumn palette
        const color = colors[Math.floor(Math.random() * colors.length)]

        const material = new THREE.MeshStandardMaterial({
            color: color,
            flatShading: true
        })

        // Main Cluster
        const geoMain = new THREE.DodecahedronGeometry(1)
        const main = new THREE.Mesh(geoMain, material)
        main.position.y = 2.2
        main.castShadow = true
        this.mesh.add(main)

        // Sub Clusters to make it irregular
        for (let i = 0; i < 4; i++) {
            const size = 0.4 + Math.random() * 0.4
            const geo = new THREE.DodecahedronGeometry(size)
            const sub = new THREE.Mesh(geo, material)

            sub.position.set(
                (Math.random() - 0.5) * 1.2,
                1.8 + Math.random() * 1.0,
                (Math.random() - 0.5) * 1.2
            )
            sub.castShadow = true
            this.mesh.add(sub)
        }
    }
}
