import * as THREE from 'three'

export default class ResumeBoard {
    constructor(game, data) {
        this.game = game
        this.data = data
        this.scene = this.game.scene

        this.group = new THREE.Group()
        this.group.position.set(data.position.x, 0, data.position.z)

        this.createBoard()
        this.createLabel()

        this.scene.add(this.group)
    }

    createBoard() {
        // Post
        const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 2)
        const postMat = new THREE.MeshStandardMaterial({ color: '#5c4033' })
        const post = new THREE.Mesh(postGeo, postMat)
        post.position.y = 1
        post.castShadow = true
        this.group.add(post)

        // Board
        const boardGeo = new THREE.BoxGeometry(3, 1.5, 0.2)
        const boardMat = new THREE.MeshStandardMaterial({ color: '#f5deb3' })
        const board = new THREE.Mesh(boardGeo, boardMat)
        board.position.y = 2
        board.castShadow = true
        this.group.add(board)
    }

    createLabel() {
        // We will create a CanvasTexture for the text to appear on the 3D object
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 256
        const context = canvas.getContext('2d')

        // Background
        context.fillStyle = '#f5deb3'
        context.fillRect(0, 0, 512, 256)

        // Text
        context.font = 'bold 40px Arial'
        context.fillStyle = '#333333'
        context.textAlign = 'center'
        context.textBaseline = 'middle'

        // Wrap text logic basic
        const title = this.data.title || "Info"
        context.fillText(title, 256, 128)

        const texture = new THREE.CanvasTexture(canvas)

        const labelGeo = new THREE.PlaneGeometry(2.8, 1.4)
        const labelMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        })
        const label = new THREE.Mesh(labelGeo, labelMat)
        label.position.set(0, 2, 0.11)
        this.group.add(label)
    }
}
