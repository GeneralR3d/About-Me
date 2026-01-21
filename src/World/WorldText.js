import * as THREE from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'

export default class WorldText {
    constructor(game, data, baseHeight = 0) {
        this.game = game
        this.data = data
        this.scene = this.game.scene

        this.group = new THREE.Group()
        // baseHeight is the terrain height. We add a slight offset (e.g. 0.5) to avoid clipping.
        // But let's assume the caller handles major offsets, or we just put it flush.
        // Actually, the user said "too low".
        // The text creates 3D letters. The letters are created at local Y=2 (line 44 in create3DTitle, geometry.translate(0, 2, -2)).
        // So global Y = baseHeight + 2.
        // If the terrain is steep, it might clip.
        // Let's set the group position to baseHeight.
        this.group.position.set(data.position.x, baseHeight, data.position.z)
        this.group.rotation.y = data.rotation || 0
        this.scene.add(this.group)

        this.font = null
        this.exploded = false
        this.titleMesh = null

        // Load Font for 3D Title
        const loader = new FontLoader()
        loader.load('/fonts/helvetiker_bold.typeface.json', (font) => {
            this.font = font
            this.create3DTitle(font)
        })

        this.createTextPanel()
    }

    create3DTitle(font) {
        const geometry = new TextGeometry(this.data.title, {
            font: font,
            size: 1.5,
            height: 0.4,
            curveSegments: 5,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.02,
            bevelOffset: 0,
            bevelSegments: 4
        })

        geometry.center()
        geometry.translate(0, 2, -2)

        const material = new THREE.MeshStandardMaterial({ color: '#ffffff' })
        this.titleMesh = new THREE.Mesh(geometry, material)
        this.titleMesh.castShadow = true
        // Store reference for raycasting
        this.titleMesh.userData = { parent: this }

        this.group.add(this.titleMesh)
    }

    explode() {
        if (this.exploded || !this.titleMesh || !this.font) return
        this.exploded = true

        // Remove original title
        this.group.remove(this.titleMesh)
        this.titleMesh.geometry.dispose()
        this.titleMesh.material.dispose()
        this.titleMesh = null

        // Create individual letters
        const text = this.data.title
        const chars = text.split('')

        let totalWidth = 0
        const charData = []
        const spacing = 0.1

        // 1. Measure and Generate Geometries
        chars.forEach(char => {
            if (char === ' ') {
                totalWidth += 0.5
                return
            }

            const geometry = new TextGeometry(char, {
                font: this.font,
                size: 1.5,
                height: 0.4,
                curveSegments: 3,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: 0.02,
                bevelOffset: 0,
                bevelSegments: 3
            })

            geometry.computeBoundingBox()

            if (!geometry.boundingBox) {
                totalWidth += 0.5
                return
            }

            const width = geometry.boundingBox.max.x - geometry.boundingBox.min.x
            const height = geometry.boundingBox.max.y - geometry.boundingBox.min.y
            const depth = geometry.boundingBox.max.z - geometry.boundingBox.min.z

            // Center the geometry locally so physics body aligns
            geometry.center()

            charData.push({
                char,
                geometry,
                width: Math.max(width, 0.1),
                height: Math.max(height, 0.1),
                depth: Math.max(depth, 0.1),
                offset: totalWidth + width / 2
            })

            totalWidth += width + spacing
        })

        const startX = -totalWidth / 2

        // 2. Create Meshes and Bodies
        charData.forEach(data => {
            try {
                const material = new THREE.MeshStandardMaterial({ color: '#ffffff' })
                const mesh = new THREE.Mesh(data.geometry, material)
                mesh.castShadow = true

                // Calculate Local Position (relative to group)
                // Original Title was at (0, 2, -2).
                const localX = startX + data.offset
                const localY = 2.0
                const localZ = -2.0

                // Convert to World Position
                const groupPos = this.group.position
                const groupRot = this.group.rotation.y

                // Rotate local offset
                const cos = Math.cos(groupRot)
                const sin = Math.sin(groupRot)

                const worldX = groupPos.x + (localX * cos - localZ * sin)
                const worldZ = groupPos.z + (localX * sin + localZ * cos)
                const worldY = groupPos.y + localY

                mesh.position.set(worldX, worldY, worldZ)
                mesh.rotation.y = groupRot

                this.scene.add(mesh)

                // Create Physics
                if (this.game.physics) {
                    const shape = this.game.physics.createBoxShape(data.width, data.height, data.depth)
                    const body = this.game.physics.createBody(mesh, 1, shape)

                    if (body) {
                        body.setActivationState(4)
                        body.activate()
                        const impulse = new this.game.physics.ammo.btVector3(
                            (Math.random() - 0.5) * 5,
                            Math.random() * 2,
                            (Math.random() - 0.5) * 5
                        )
                        body.applyCentralImpulse(impulse)
                    }
                }
            } catch (e) {
                console.error("Explode error", e)
            }
        })
    }

    createTextPanel() {
        const maxWidth = 1200
        const fontSize = 36
        const lineHeight = 46
        const padding = 30

        // Measure Logic
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        context.font = `bold ${fontSize}px Arial`

        const rawLines = this.data.text.split('\n')
        let finalLines = []

        // Word wrap
        rawLines.forEach(line => {
            if (line.trim() === '') {
                finalLines.push('')
                return
            }

            const words = line.split(' ')
            let currentLine = words[0]

            for (let i = 1; i < words.length; i++) {
                const word = words[i]
                const width = context.measureText(currentLine + " " + word).width
                if (width < maxWidth) {
                    currentLine += " " + word
                } else {
                    finalLines.push(currentLine)
                    currentLine = word
                }
            }
            finalLines.push(currentLine)
        })

        // Resize canvas to fit
        const canvasWidth = maxWidth + (padding * 2)
        const canvasHeight = (finalLines.length * lineHeight) + (padding * 2)

        canvas.width = canvasWidth
        canvas.height = canvasHeight

        // Background
        context.fillStyle = "rgba(0, 0, 0, 0.7)"
        context.fillRect(0, 0, canvasWidth, canvasHeight)

        // Text Settings
        context.font = `bold ${fontSize}px Arial`
        context.fillStyle = '#ffffff'
        context.textAlign = 'left'
        context.textBaseline = 'top'

        let cursorY = padding

        finalLines.forEach((line) => {
            context.fillText(line, padding, cursorY)
            cursorY += lineHeight
        })

        const texture = new THREE.CanvasTexture(canvas)
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter

        // Plane Dimensions
        const planeWidth = 15
        const planeHeight = planeWidth * (canvasHeight / canvasWidth)
        const planeDepth = 0.5

        const geometry = new THREE.BoxGeometry(planeWidth, planeHeight, planeDepth)

        // Materials
        const sideMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0,
            side: THREE.FrontSide
        })

        const frontMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0,
            side: THREE.FrontSide
        })

        // Box Face Material Order: Right, Left, Top, Bottom, Front, Back
        const materials = [
            sideMat, sideMat, sideMat, sideMat, frontMat, sideMat
        ]

        this.panelMesh = new THREE.Mesh(geometry, materials)

        // Position relative to title
        // Title Center Y is 2.0. Height is ~1.5. Top is ~2.75.
        // We want the bottom of the panel to be above the title.
        const titleTopY = 2.75
        const margin = 0.5
        const panelBottomY = titleTopY + margin

        // Panel is a box centered at (0,0,0) locally.
        // So we place it at panelBottomY + (planeHeight / 2)
        const panelCenterY = panelBottomY + (planeHeight / 2)

        this.panelMesh.position.set(0, panelCenterY, -2)
        this.panelMesh.visible = false

        this.group.add(this.panelMesh)
    }

    update() {
        if (!this.panelMesh || !this.game.character || !this.game.character.mesh) return

        // Proximity Check
        const charPos = new THREE.Vector3()
        this.game.character.mesh.getWorldPosition(charPos)

        const myPos = new THREE.Vector3()
        this.group.getWorldPosition(myPos)

        const dist = charPos.distanceTo(myPos)

        const triggerDist = 5
        const fadeSpeed = 0.05

        const materials = Array.isArray(this.panelMesh.material) ? this.panelMesh.material : [this.panelMesh.material]
        // Filter unique materials to avoid multi-apply
        const uniqueMats = new Set(materials)

        if (dist < triggerDist) {
            // Enable rendering if within range
            if (!this.panelMesh.visible) {
                this.panelMesh.visible = true
            }

            // Fade In
            uniqueMats.forEach(mat => {
                if (mat.opacity < 1) {
                    mat.opacity += fadeSpeed
                    if (mat.opacity > 1) mat.opacity = 1
                }
            })
        } else {
            // Fade Out
            let anyVisible = false
            uniqueMats.forEach(mat => {
                if (mat.opacity > 0) {
                    mat.opacity -= fadeSpeed
                    if (mat.opacity < 0) mat.opacity = 0
                }
                if (mat.opacity > 0) {
                    anyVisible = true
                }
            })

            // Disable rendering if completely transparent
            if (!anyVisible) {
                this.panelMesh.visible = false
            }
        }
    }
}
