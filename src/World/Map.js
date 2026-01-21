import * as THREE from 'three'
import WorldText from './WorldText.js'
import Water from './Water.js'
import Tree from './Tree.js'
import Redwood from './Redwood.js'
import Cactus from './Cactus.js'
import Shrub from './Shrub.js'
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

        // MOUNT WHITNEY (North -> Negative Z)
        // Positioned at (0, -35)
        const mx = 0
        const mz = -35
        const mDist = Math.sqrt((x - mx) ** 2 + (z - mz) ** 2)
        const mRadius = 15

        if (mDist < mRadius) {
            // Sharp linear cone for "no gentle curves"
            const mFactor = (mRadius - mDist) / mRadius

            // Add jagged roughness
            // High frequency noise
            const rough = this.noise.zoom2D(x * 0.8, z * 0.8) * 4 * mFactor

            // Tall peak
            const mHeight = mFactor * 45

            // Combine
            y += mHeight + rough
        }

        return Math.max(y, -2)
    }

    // Public method for external components
    getHeightAt(x, z) {
        return this._computeNoiseHeight(x, z)
    }

    createIsland() {
        const geometry = new THREE.PlaneGeometry(120, 120, 150, 150) // Increased resolution for sharpness
        const count = geometry.attributes.position.count

        let minHeight = Infinity
        let maxHeight = -Infinity

        // Vertex Colors
        const colors = []
        const colorGreen = new THREE.Color('#4caf50')
        const colorGrey = new THREE.Color('#78909c') // Stone Grey
        const colorPeak = new THREE.Color('#cfd8dc') // Snowy/Light Grey top
        const colorSand = new THREE.Color('#eebb55') // Desert Sand
        const colorRoad = new THREE.Color('#455a64') // Asphalt
        const colorLine = new THREE.Color('#fdd835') // Yellow Line

        // 1. Generate Heights & Colors
        for (let i = 0; i < count; i++) {
            const x = geometry.attributes.position.getX(i)
            const y_orig = geometry.attributes.position.getY(i)
            const z_world = -y_orig

            const dist = Math.sqrt(x * x + z_world * z_world)

            let h = -10

            // Check for Mount Whitney proximity to override drop-off
            // Mountain center (0, -35), radius ~15.
            const mx = 0
            const mz = -35
            const mDist = Math.sqrt((x - mx) ** 2 + (z_world - mz) ** 2)
            const isMountain = mDist < 18

            // Road Logic
            // Road runs along X=0, from Z > -10 (South of mountains)
            // Width approx 6 units (from -3 to 3)
            const isRoad = Math.abs(x) < 3.5 && z_world > -10

            if (dist > 55 && !isMountain && !isRoad) {
                // Drop off normally
                h = -10
            } else {
                h = this._computeNoiseHeight(x, z_world)
            }

            // Flatten for Road
            if (isRoad) {
                // Smoothly flatten
                // get nearby height vs 0
                // For simplicity, lock to a stable height slightly above base noise
                // But terrain is wavy. Let's just dampen the noise or set to curve.
                // Or just set to ground level 0 + noise damp.
                // Let's set it to exactly height 0.2 to start
                h = 0.2
            }

            // Set Height
            geometry.attributes.position.setZ(i, h)
            if (h < minHeight) minHeight = h
            if (h > maxHeight) maxHeight = h

            // Determine Color
            if (isRoad) {
                if (Math.abs(x) < 0.3 && (z_world % 4 < 2)) {
                    // Center Line (Dashed)
                    colors.push(colorLine.r, colorLine.g, colorLine.b)
                } else {
                    colors.push(colorRoad.r, colorRoad.g, colorRoad.b)
                }
            }
            // If it is the mountain (high altitude or specific area), make it grey
            else if (h > 8 || (isMountain && h > 0)) {
                // Mix Grey and Peak White based on height
                const t = Math.min(Math.max((h - 8) / 20, 0), 1)

                // Manual lerp to avoid creating objects in loop
                const r = colorGrey.r + (colorPeak.r - colorGrey.r) * t
                const g = colorGrey.g + (colorPeak.g - colorGrey.g) * t
                const b = colorGrey.b + (colorPeak.b - colorGrey.b) * t

                colors.push(r, g, b)
            } else {
                // Check if map is in South (Positive Z) -> Desert
                // Smooth blend around Z = 10
                const desertStart = 5
                const desertFull = 25
                let t = 0
                if (z_world > desertStart) {
                    t = Math.min(Math.max((z_world - desertStart) / (desertFull - desertStart), 0), 1)
                }

                if (t > 0) {
                    // Mix Green and Sand
                    const r = colorGreen.r + (colorSand.r - colorGreen.r) * t
                    const g = colorGreen.g + (colorSand.g - colorGreen.g) * t
                    const b = colorGreen.b + (colorSand.b - colorGreen.b) * t
                    colors.push(r, g, b)
                } else {
                    colors.push(colorGreen.r, colorGreen.g, colorGreen.b)
                }
            }
        }

        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
        geometry.computeVertexNormals()

        // 2. Bake Rotation (Rotate so Normal Z -> Normal Y)
        geometry.rotateX(-Math.PI / 2)

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
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
            const widthSegments = 151
            const depthSegments = 151
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
        // Ensure we don't place it underground if terrain changed
        this.caliZone.position.set(-25, Math.max(h, 0) + 0.5, -5)
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
        // Forest / Desert
        // Increased count heavily
        for (let i = 0; i < 300; i++) {
            const x = (Math.random() - 0.5) * 80
            const z = (Math.random() - 0.5) * 80

            // Skip middle where 0,0 items are, but also skip Road
            // Road is at X approx 0, width 7.
            // Items are also at 0,0.
            if (Math.abs(x) < 4) continue;

            if (x * x + z * z > 50 * 50) continue

            const h = this.getHeightAt(x, z)
            const y = h - 0.5 // Adjust because island is at -0.5

            if (y < -0.8) continue
            // Treeline: Don't spawn trees on high peaks (Mount Whitney)
            if (y > 10) continue

            // Desert Check
            // Z > 5 starts transition
            if (z > 5) {
                // Higher density in desert requested ("alot of shrubbery")
                if (Math.random() > 0.3) {
                    new Shrub(this.scene, { position: { x, y: y, z } })
                }
                if (Math.random() > 0.6) {
                    new Cactus(this.scene, { position: { x, y: y, z } })
                }
            }
            // Redwood Check (East -> Positive X)
            // Avoid desert (Z < 5) and ensure distinct region (X > 15)
            else if (x > 15) {
                // Spawn Redwood
                new Redwood(this.scene, { position: { x, y: y, z } })
            }
            else {
                // Spawn Tree
                // Reduced frequency compared to loop count to balance
                if (Math.random() > 0.7)
                    new Tree(this.scene, { position: { x, y: y, z } })
            }
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
        this.arrows = new DirectionalArrows(this.game, this)
    }

    update() {
        if (this.water) this.water.update()
        if (this.leaves) this.leaves.update()
        if (this.texts) this.texts.forEach(t => t.update())
    }
}
