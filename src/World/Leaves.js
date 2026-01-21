import * as THREE from 'three'

export default class Leaves {
    constructor(game) {
        this.game = game
        this.scene = this.game.scene

        this.count = 400
        this.setGeometry()
        this.setMaterial()
        this.setMesh()
    }

    setGeometry() {
        this.geometry = new THREE.BufferGeometry()

        const positions = new Float32Array(this.count * 3)
        const randomness = new Float32Array(this.count * 3)
        const speeds = new Float32Array(this.count)

        for (let i = 0; i < this.count; i++) {
            const i3 = i * 3

            // Position
            positions[i3] = (Math.random() - 0.5) * 60
            positions[i3 + 1] = Math.random() * 10 + 2
            positions[i3 + 2] = (Math.random() - 0.5) * 60

            // Random offset for swaying
            randomness[i3] = Math.random()
            randomness[i3 + 1] = Math.random()
            randomness[i3 + 2] = Math.random()

            // Speed
            speeds[i] = 0.5 + Math.random() * 0.5
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        this.geometry.setAttribute('aRandom', new THREE.BufferAttribute(randomness, 3))
        this.geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))
    }

    setMaterial() {
        this.material = new THREE.PointsMaterial({
            color: '#ff8f00',
            size: 0.3,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8
        })
    }

    setMesh() {
        this.mesh = new THREE.Points(this.geometry, this.material)
        this.scene.add(this.mesh)
    }

    update() {
        const time = this.game.clock.getElapsedTime()
        const positions = this.geometry.attributes.position.array

        for (let i = 0; i < this.count; i++) {
            const i3 = i * 3

            // Fall down
            positions[i3 + 1] -= 0.02 * this.geometry.attributes.aSpeed.array[i]

            // Reset if below 0
            if (positions[i3 + 1] < 0) {
                positions[i3 + 1] = 10
                positions[i3] = (Math.random() - 0.5) * 60
                positions[i3 + 2] = (Math.random() - 0.5) * 60
            }

            // Sway x/z
            const xOffset = Math.sin(time + this.geometry.attributes.aRandom.array[i3] * 10) * 0.02
            const zOffset = Math.cos(time + this.geometry.attributes.aRandom.array[i3 + 2] * 10) * 0.02

            positions[i3] += xOffset
            positions[i3 + 2] += zOffset
        }

        this.geometry.attributes.position.needsUpdate = true
    }
}
