import * as THREE from 'three'

export default class Cactus {
    constructor(scene, options = {}) {
        this.scene = scene
        this.position = options.position || { x: 0, y: 0, z: 0 }

        this.mesh = new THREE.Group()
        this.mesh.position.set(this.position.x, this.position.y, this.position.z)

        // Randomize scale
        const scale = 0.8 + Math.random() * 0.4
        this.mesh.scale.set(scale, scale, scale)

        // Random rotation
        this.mesh.rotation.y = Math.random() * Math.PI * 2

        this.createBody()

        this.scene.add(this.mesh)
    }

    createBody() {
        const material = new THREE.MeshStandardMaterial({
            color: '#66bb6a', // Cactus Green
            flatShading: true,
            roughness: 0.9
        })

        // Main Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.25, 0.25, 2.5, 6)
        const trunk = new THREE.Mesh(trunkGeo, material)
        trunk.position.y = 1.25
        trunk.castShadow = true
        trunk.receiveShadow = true
        this.mesh.add(trunk)

        // Rounded Top
        const topGeo = new THREE.SphereGeometry(0.25, 6, 5)
        const top = new THREE.Mesh(topGeo, material)
        top.position.y = 2.5
        top.castShadow = true
        this.mesh.add(top)

        // Arms (0 to 2 arms)
        const armCount = Math.floor(Math.random() * 3)

        for (let i = 0; i < armCount; i++) {
            const height = 1.0 + Math.random() * 0.8 // Height on trunk
            const side = (Math.random() > 0.5) ? 1 : -1
            const armLen = 0.4 + Math.random() * 0.3

            // Arm Horizontal
            const hGeo = new THREE.CylinderGeometry(0.18, 0.18, armLen, 5)
            hGeo.rotateZ(Math.PI / 2)
            const hMesh = new THREE.Mesh(hGeo, material)
            hMesh.position.set(side * (0.25 + armLen / 2 - 0.05), height, 0)
            hMesh.castShadow = true
            this.mesh.add(hMesh)

            // Arm Vertical
            const vLen = 0.4 + Math.random() * 0.6
            const vGeo = new THREE.CylinderGeometry(0.18, 0.18, vLen, 5)
            const vMesh = new THREE.Mesh(vGeo, material)
            vMesh.position.set(side * (0.25 + armLen - 0.05), height + vLen / 2 - 0.05, 0)
            vMesh.castShadow = true
            this.mesh.add(vMesh)

            // Arm Top
            const aTopGeo = new THREE.SphereGeometry(0.18, 5, 4)
            const aTop = new THREE.Mesh(aTopGeo, material)
            aTop.position.set(side * (0.25 + armLen - 0.05), height + vLen - 0.05, 0)
            aTop.castShadow = true
            this.mesh.add(aTop)
        }
    }
}
