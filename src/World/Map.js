import * as THREE from 'three'
import WorldText from './WorldText.js'
import Water from './Water.js'
import Tree from './Tree.js'
import Leaves from './Leaves.js'
import Noise from '../Utils/Noise.js'
import { content } from '../Utils/ResumeData.js'
import DirectionalArrows from './DirectionalArrows.js'

export default class Map {
    constructor(game) {
        this.game = game
        this.scene = this.game.scene
        this.noise = new Noise()

        this.water = new Water(game)

        this.createIsland()
        this.populateResumeContent()
        this.createNature()
        this.createArrows()

        this.leaves = new Leaves(game)
    }

    // Base noise function
    _computeNoiseHeight(x, z) {
        let y = this.noise.zoom2D(x * 0.03, z * 0.03) * 4
        y += this.noise.zoom2D(x * 0.1, z * 0.1) * 1

        const dist = Math.sqrt(x * x + z * z)
        if (dist < 10) {
            y *= Math.min(dist / 10, 1)
        }

        return Math.max(y, -2)
    }

    // Public method for external components
    getHeightAt(x, z) {
        return this._computeNoiseHeight(x, z)
    }

    createIsland() {
        const geometry = new THREE.PlaneGeometry(120, 120, 100, 100)
        const count = geometry.attributes.position.count

        let minHeight = Infinity
        let maxHeight = -Infinity

        // 1. Generate Heights
        for (let i = 0; i < count; i++) {
            const x = geometry.attributes.position.getX(i)
            // Plane is originally on XY. 
            // We want it on XZ. 
            // We will rotate X -90 later. 
            // This maps original Y -> World -Z.
            // So World Z = -Original Y => Original Y = -World Z.
            const y_orig = geometry.attributes.position.getY(i)
            const z_world = -y_orig

            const dist = Math.sqrt(x * x + z_world * z_world)

            if (dist > 55) {
                // Drop off
                const h = -10
                geometry.attributes.position.setZ(i, h)
                if (h < minHeight) minHeight = h
                if (h > maxHeight) maxHeight = h
            } else {
                const h = this._computeNoiseHeight(x, z_world)
                geometry.attributes.position.setZ(i, h)
                if (h < minHeight) minHeight = h
                if (h > maxHeight) maxHeight = h
            }
        }

        geometry.computeVertexNormals()

        // 2. Bake Rotation (Rotate so Normal Z -> Normal Y)
        geometry.rotateX(-Math.PI / 2)

        const material = new THREE.MeshStandardMaterial({
            color: '#4caf50',
            flatShading: true,
            roughness: 0.8
        })

        this.island = new THREE.Mesh(geometry, material)
        // No rotation on mesh!
        this.island.position.y = -0.5
        this.island.receiveShadow = true
        this.scene.add(this.island)

        // 3. Physics Terrain
        if (this.game.physics && this.game.physics.physicsWorld) {
            const widthSegments = 101
            const depthSegments = 101
            // Heightfield needs heights in grid order.
            // PlaneGeometry orders: Row by row (Y), then Column (X)? Or X then Y?
            // "Three.js PlaneGeometry: it's row-major (y) or column-major (x)?"
            // It builds row by row. y varies inner? No.
            // Vertices are usually: (x0, y0), (x1, y0)... 
            // Actually, depends on implementation.
            // Assuming standard grid.

            // We need to extract the Y values (since we rotated Z->Y).
            // BUT: Physics Terrain expects data in a specific order.
            // btHeightfieldTerrainShape: 
            // "The data ... integer/float array ... Z is rows, X is columns?"
            // It usually expects Z to be major axis?
            // Let's just blindly copy the Y values from the now-rotated geometry.
            // Ensure we handle min/max.

            const heightData = new Float32Array(widthSegments * depthSegments)

            for (let i = 0; i < count; i++) {
                // Now height is in Y
                heightData[i] = geometry.attributes.position.getY(i)
            }

            this.game.physics.createTerrainBody(
                this.island,
                120,
                120,
                widthSegments,
                depthSegments,
                heightData,
                minHeight,
                maxHeight
            )
        }

        // California Zone Marker
        const caliGeo = new THREE.CylinderGeometry(15, 15, 1.1, 8)
        const caliMat = new THREE.MeshStandardMaterial({ color: '#fdd835', transparent: true, opacity: 0.5 })
        this.caliZone = new THREE.Mesh(caliGeo, caliMat)
        // Adjust to conform roughly
        const h = this.getHeightAt(-25, -5)
        this.caliZone.position.set(-25, h + 0.5, -5)
        this.caliZone.receiveShadow = true
        this.scene.add(this.caliZone)

        this.createBoundaryLines()
    }

    createBoundaryLines() {
        const radius = 50
        const segments = 100 // Number of lines
        const height = 20

        const geometry = new THREE.BufferGeometry()
        const positions = []

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2
            const x = Math.cos(angle) * radius
            const z = Math.sin(angle) * radius

            // Line start (bottom) and end (top)
            positions.push(x, -5, z)
            positions.push(x, height, z)
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

        const material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3
        })

        this.boundaryLines = new THREE.LineSegments(geometry, material)
        this.scene.add(this.boundaryLines)
    }

    // Populate Resume Content
    populateResumeContent() {
        this.texts = []
        content.forEach(data => {
            let h = 0
            if (data.position.x !== undefined && data.position.z !== undefined) {
                h = this.getHeightAt(data.position.x, data.position.z)
            }
            // Add a small offset to ensure it sits on top.
            // getHeightAt returns noise value. Terrain is noise - 0.5.
            // So h is 0.5 above terrain. +1 makes it 1.5 above terrain.
            this.texts.push(new WorldText(this.game, data, h + 1))
        })
    }

    createNature() {
        // Forest
        for (let i = 0; i < 60; i++) {
            const x = (Math.random() - 0.5) * 80
            const z = (Math.random() - 0.5) * 80

            if (x * x + z * z > 50 * 50) continue
            if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;

            const h = this.getHeightAt(x, z)
            const y = h - 0.5 // Adjust because island is at -0.5

            if (y < -0.8) continue

            new Tree(this.scene, { position: { x, y: y, z } })
        }

        // Stones
        const stoneGeo = new THREE.DodecahedronGeometry(0.5)
        const stoneMat = new THREE.MeshStandardMaterial({ color: '#9e9e9e' })

        for (let i = 0; i < 25; i++) {
            const x = (Math.random() - 0.5) * 80
            const z = (Math.random() - 0.5) * 80

            if (x * x + z * z > 50 * 50) continue

            const h = this.getHeightAt(x, z)
            const y = h - 0.5

            const stone = new THREE.Mesh(stoneGeo, stoneMat)
            stone.position.set(x, y + 0.2, z)
            stone.castShadow = true
            this.scene.add(stone)
        }
    }

    createArrows() {
        this.arrows = new DirectionalArrows(this.game)
    }

    update() {
        if (this.water) this.water.update()
        if (this.leaves) this.leaves.update()
        if (this.texts) this.texts.forEach(t => t.update())
    }
}
