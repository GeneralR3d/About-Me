import * as THREE from 'three'

export default class DirectionalArrows {
    constructor(game, map) {
        this.game = game
        this.scene = this.game.scene
        this.physics = this.game.physics
        this.map = map

        this.signs = []
        this.createSigns()
    }

    createSigns() {
        const directions = [
            { label: 'Experience', dir: 'North', x: 0, z: -10, color: '#8b4513', rotY: 0 },             // Points -Z
            { label: 'Activities', dir: 'South', x: 0, z: 10, color: '#8b4513', rotY: Math.PI },         // Points +Z
            { label: 'Education', dir: 'East', x: 10, z: 0, color: '#8b4513', rotY: -Math.PI / 2 },     // Points +X
            { label: 'Projects', dir: 'West', x: -10, z: 0, color: '#8b4513', rotY: Math.PI / 2 }       // Points -X
        ]

        directions.forEach(cfg => this.createSingleSign(cfg))
    }

    createSingleSign(config) {
        // Sign Dimensions
        const postHeight = 5.5
        const postRadius = 0.25
        const boardWidth = 4.0
        const boardHeight = 1.3
        const boardThickness = 0.8 // Thicker board

        // Group
        const signGroup = new THREE.Group()

        // 1. Post
        const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 8)
        const postMat = new THREE.MeshStandardMaterial({
            color: 0x5D4037, // Dark brown
            roughness: 0.8
        })
        const postMesh = new THREE.Mesh(postGeo, postMat)
        postMesh.castShadow = true
        postMesh.receiveShadow = true
        signGroup.add(postMesh)

        // 2. Board
        const shape = new THREE.Shape()
        const halfH = boardHeight / 2
        // Shape pointing Right (+X)
        shape.moveTo(0, -halfH)
        shape.lineTo(boardWidth - 0.5, -halfH)
        shape.lineTo(boardWidth, 0)
        shape.lineTo(boardWidth - 0.5, halfH)
        shape.lineTo(0, halfH)
        shape.lineTo(0, -halfH)

        const extrudeSettings = {
            steps: 1,
            depth: boardThickness,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 2
        }

        const boardGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
        boardGeo.center()

        const boardMat = new THREE.MeshStandardMaterial({
            color: 0x8D6E63, // Lighter brown
            roughness: 0.7
        })
        const boardMesh = new THREE.Mesh(boardGeo, boardMat)

        // Position board on post
        boardMesh.position.y = (postHeight / 2) - 0.8
        boardMesh.position.x = 0

        // Rotate board to point -Z (local forward)
        // Shape is in XY pointing +X. Rotate Y +90 -> Points -Z.
        boardMesh.rotation.y = Math.PI / 2

        boardMesh.castShadow = true
        boardMesh.receiveShadow = true
        signGroup.add(boardMesh)

        // 3. Label
        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 256
        const ctx = canvas.getContext('2d')

        // Clear background
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Text
        ctx.fillStyle = '#3E2723' // Dark text (engraved look)
        ctx.shadowColor = "rgba(255,255,255,0.4)"
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 1
        ctx.shadowOffsetY = 1

        ctx.font = 'bold 150px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(config.label.toUpperCase(), 512, 128)

        const labelTexture = new THREE.CanvasTexture(canvas)
        const labelGeo = new THREE.PlaneGeometry(3.2, 0.8)
        const labelMat = new THREE.MeshBasicMaterial({
            map: labelTexture,
            transparent: true,
            side: THREE.DoubleSide
        })

        // Front Face (Z+) relative to boardMesh
        const label1 = new THREE.Mesh(labelGeo, labelMat)
        label1.position.z = (boardThickness / 2) + 0.02
        boardMesh.add(label1)

        // Back Face (Z-) - Rotate Y 180
        const label2 = label1.clone()
        label2.position.z = -(boardThickness / 2) - 0.02
        label2.rotation.y = Math.PI
        boardMesh.add(label2)

        // 4. Global Transform

        // Calculate ground height
        let groundY = 0
        if (this.map) {
            // map.getHeightAt returns h. Island is at -0.5.
            groundY = this.map.getHeightAt(config.x, config.z) - 0.5
        }

        // Plant the post.
        // We want the post to be slightly submerged so it looks firm.
        // Let's bury 0.5m of the 3.5m post.
        // Center of post is at local 0.
        // Post goes from -1.75 to +1.75.
        // We want bottom (-1.75) to be at GroundY - 0.5.
        // So CenterY should be GroundY - 0.5 + 1.75 = GroundY + 1.25.
        const yPos = groundY + 1.75

        signGroup.position.set(config.x, yPos, config.z)
        signGroup.rotation.y = config.rotY

        this.scene.add(signGroup)
        this.signs.push(signGroup)

        // 5. Physics
        if (this.physics && this.physics.physicsWorld) {
            // Box shape for the post + board approximation or just post?
            // User said "firmly planted", "not movable". Mass = 0.
            // A simple box for the exposed part is fine.

            const width = postRadius * 2
            const depth = postRadius * 2
            const height = postHeight

            const shape = this.physics.createBoxShape(width, height, depth)
            const mass = 0 // Static

            this.physics.createBody(signGroup, mass, shape)
        }
    }
}
