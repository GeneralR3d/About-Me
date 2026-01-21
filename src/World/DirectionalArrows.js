import * as THREE from 'three'

export default class DirectionalArrows {
    constructor(game) {
        this.game = game
        this.scene = this.game.scene
        this.physics = this.game.physics

        this.arrows = []
        this.createArrows()
    }

    createArrows() {
        const directions = [
            { label: 'Experience', dir: 'North', x: 0, z: -4, color: '#e53935', rotY: 0 },             // Points -Z
            { label: 'Activities', dir: 'South', x: 0, z: 4, color: '#43a047', rotY: Math.PI },         // Points +Z
            { label: 'Education', dir: 'East', x: 4, z: 0, color: '#1e88e5', rotY: -Math.PI / 2 },     // Points +X
            { label: 'Projects', dir: 'West', x: -4, z: 0, color: '#fb8c00', rotY: Math.PI / 2 }       // Points -X
        ]

        directions.forEach(cfg => this.createSingleArrow(cfg))
    }

    createSingleArrow(config) {
        // Dimensions
        const shaftWidth = 1.2
        const shaftLength = 4
        const headWidth = 3   // Wider head
        const headLength = 2
        const thickness = 0.8 // Height of the prism

        // 1. Define Arrow Shape
        const shape = new THREE.Shape()
        // Start at bottom-left of shaft
        shape.moveTo(-shaftWidth / 2, 0)
        // Up shaft
        shape.lineTo(-shaftWidth / 2, shaftLength)
        // Out to head wing
        shape.lineTo(-headWidth / 2, shaftLength)
        // Tip
        shape.lineTo(0, shaftLength + headLength)
        // Other side wing
        shape.lineTo(headWidth / 2, shaftLength)
        // Back to shaft
        shape.lineTo(shaftWidth / 2, shaftLength)
        // Down shaft
        shape.lineTo(shaftWidth / 2, 0)
        // Close
        shape.lineTo(-shaftWidth / 2, 0)

        // 2. Extrude
        const extrudeSettings = {
            steps: 1,
            depth: thickness,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.1,
            bevelSegments: 2
        }

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)

        // Center the geometry so (0,0,0) is the center of mass
        geometry.center()

        const material = new THREE.MeshStandardMaterial({
            color: config.color,
            roughness: 0.3,
            metalness: 0.2
        })

        const arrowMesh = new THREE.Mesh(geometry, material)
        arrowMesh.castShadow = true
        arrowMesh.receiveShadow = true

        // 3. Label
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 128
        const ctx = canvas.getContext('2d')
        // Transparent bg
        // ctx.fillStyle = config.color
        // ctx.fillRect(0,0,512,128)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)' // White text
        // Add a stroke or shadow for visibility?
        ctx.shadowColor = "black"
        ctx.shadowBlur = 5
        ctx.font = 'bold 80px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(config.label.toUpperCase(), 256, 64)

        const labelTexture = new THREE.CanvasTexture(canvas)
        const labelGeo = new THREE.PlaneGeometry(6, 1.5)
        const labelMat = new THREE.MeshBasicMaterial({
            map: labelTexture,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.1
        })
        const labelMesh = new THREE.Mesh(labelGeo, labelMat)

        // Position Label: Above the arrow
        // Geometry is centered. Thickness is along Z (originally).
        // Bounds: Z from -thickness/2 to thickness/2.
        // We want label on top face.
        labelMesh.position.z = (thickness / 2) + 0.1

        // arrowMesh is the parent. 
        // Note: ExtrudeGeometry extrudes along Z. 
        // Shape is in XY.
        // So "Top" face is +Z.
        // We want arrow flat on ground. Ground is XZ.
        // So we rotate the MESH -90 on X?
        // Let's attach label to mesh first.

        arrowMesh.add(labelMesh)

        // 4. Group & Transform
        const arrowGroup = new THREE.Group()
        arrowGroup.add(arrowMesh)

        // Rotate Mesh to lie flat
        // Shape XY, Extrude Z.
        // Current: Standing up.
        // Rotate X -90 -> Shape XZ, Extrude -Y? No.
        // Rotate X -90 -> Z becomes Y? 
        // Extrude axis was Z. Now Y. So thickness is vertical. Correct.
        // Shape Y (Arrow length) becomes -Z (North).
        // Shape X (Width) stays X.

        arrowMesh.rotation.x = -Math.PI / 2

        // Now Label:
        // Was at Z+. After mesh rot X -90, Z+ is Y+.
        // So label is on top. Correct.
        // Label orientation:
        // Plane is XY. 
        // Mesh X rot -90 -> Plane is XZ. Text reads along X?
        // Our texture is horizontal. 
        // If Arrow points North (-Z), we want text reading Left-Right.
        // Label mesh rotation needs to be checked.
        // Currently label is default rotation (0,0,0) relative to arrowMesh.
        // arrowMesh is rotated -90 X.
        // So label is also rotated -90 X. Lying flat.
        // Texture is upright in UVs.
        // Should be readable.

        // Global Direction
        arrowGroup.rotation.y = config.rotY
        arrowGroup.position.set(config.x, 5, config.z)

        this.scene.add(arrowGroup)
        this.arrows.push(arrowGroup)

        // 5. Physics
        if (this.physics && this.physics.physicsWorld) {
            // Box approximation works well for a prism flat on ground
            const width = headWidth // Max width
            const length = shaftLength + headLength
            const height = thickness

            const shape = this.physics.createBoxShape(width, height, length)
            const mass = 1000

            const body = this.physics.createBody(arrowGroup, mass, shape)
            if (body) {
                body.setFriction(0.8)
                body.setRollingFriction(0.1)
            }
        }
    }
}
