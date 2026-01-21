import * as THREE from 'three'

export default class ContactCubes {
    constructor(game) {
        this.game = game
        this.scene = game.scene
        this.physics = game.physics

        this.textureLoader = new THREE.TextureLoader()
        this.textureLoader.setCrossOrigin('anonymous')

        this.createCubes()

        // Popup Elements
        this.popup = document.getElementById('popup')
        this.popupContent = document.getElementById('popup-content')
        this.popupClose = document.getElementById('popup-close')

        if (this.popupClose) {
            this.popupClose.addEventListener('click', () => {
                if (this.popup) this.popup.classList.add('hidden')
            })
        }
    }

    createCubes() {
        // Size of cubes
        const size = 2
        const boxGeometry = new THREE.BoxGeometry(size, size, size)

        const createMaterialFromUrl = (url) => {
            const material = new THREE.MeshStandardMaterial({
                color: '#ffffff',
                roughness: 0.2,
                metalness: 0.1
            })

            const image = new Image()
            image.src = url
            image.crossOrigin = "Anonymous"
            image.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = 512
                canvas.height = 512
                const ctx = canvas.getContext('2d')

                // Fill white background
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, 512, 512)

                // Draw image centered (keep aspect ratio if needed, but here simple draw)
                // We'll just draw it full size or with some padding
                ctx.drawImage(image, 0, 0, 512, 512)

                const texture = new THREE.CanvasTexture(canvas)
                texture.colorSpace = THREE.SRGBColorSpace

                material.map = texture
                material.needsUpdate = true
            }
            return material
        }

        // GitHub Cube
        const githubMaterial = createMaterialFromUrl(import.meta.env.BASE_URL + 'icons/github-logo-6532.png')

        this.githubCube = new THREE.Mesh(boxGeometry, githubMaterial)
        this.githubCube.position.set(-3, 0, 0) // Start high to fall
        this.githubCube.castShadow = true
        this.githubCube.receiveShadow = true
        this.githubCube.userData.parent = this
        this.githubCube.userData.type = 'github'

        this.scene.add(this.githubCube)

        // Physics for GitHub Cube
        if (this.physics && this.physics.physicsWorld) {
            const shape = this.physics.createBoxShape(size, size, size)
            this.physics.createBody(this.githubCube, 40, shape)
        }

        // LinkedIn Cube
        const linkedinMaterial = createMaterialFromUrl(import.meta.env.BASE_URL + 'icons/black-linkedin-logo-15915.png')

        this.linkedinCube = new THREE.Mesh(boxGeometry, linkedinMaterial)
        this.linkedinCube.position.set(3, 0, 0)
        this.linkedinCube.castShadow = true
        this.linkedinCube.receiveShadow = true
        this.linkedinCube.userData.parent = this
        this.linkedinCube.userData.type = 'linkedin'

        this.scene.add(this.linkedinCube)

        // Physics for LinkedIn Cube
        if (this.physics && this.physics.physicsWorld) {
            const shape = this.physics.createBoxShape(size, size, size)
            this.physics.createBody(this.linkedinCube, 50, shape)
        }

        // Gmail Cube
        const gmailMaterial = createMaterialFromUrl(import.meta.env.BASE_URL + 'icons/google-gmail-black-24179.png')

        this.gmailCube = new THREE.Mesh(boxGeometry, gmailMaterial)
        this.gmailCube.position.set(0, 0, 0)
        this.gmailCube.castShadow = true
        this.gmailCube.receiveShadow = true
        this.gmailCube.userData.parent = this
        this.gmailCube.userData.type = 'gmail'

        this.scene.add(this.gmailCube)

        // Physics for Gmail Cube
        if (this.physics && this.physics.physicsWorld) {
            const shape = this.physics.createBoxShape(size, size, size)
            this.physics.createBody(this.gmailCube, 45, shape)
        }
    }

    onClick(object) {
        if (object.userData.type === 'github') {
            console.log('GitHub Cube Clicked')
            window.open('https://github.com/GeneralR3d', '_blank')
        } else if (object.userData.type === 'linkedin') {
            console.log('LinkedIn Cube Clicked')
            window.open('https://linkedin.com/in/ding-ren-tuan', '_blank')
        } else if (object.userData.type === 'gmail') {
            console.log('Gmail Cube Clicked')
            if (this.popup && this.popupContent) {
                this.popupContent.innerText = 'tdrdingren@gmail.com'
                this.popup.classList.remove('hidden')
            }
        }
    }
}
