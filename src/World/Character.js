import * as THREE from 'three'

export default class Character {
    constructor(game) {
        this.game = game
        this.scene = this.game.scene
        this.physics = this.game.physics

        this.speed = 10 // Higher for physics forces/velocity
        this.turnSpeed = 0.05

        this.initMesh()
        this.initPhysics()
        this.setControls()
    }

    initPhysics() {
        if (!this.physics || !this.physics.physicsWorld) return

        // Capsule Shape
        const radius = 0.4
        const height = 1.0 // Height of cylinder part of capsule
        const shape = this.physics.createCapsuleShape(radius, height)

        // Position
        // Start high up
        this.mesh.position.set(0, 5, 0)

        // Mass
        const mass = 1

        // Create Body
        try {
            this.body = this.physics.createBody(this.mesh, mass, shape)
            if (this.body) {
                console.log("Character Body Created", this.body)
                // Prevent tipping
                this.body.setAngularFactor(new this.physics.ammo.btVector3(0, 1, 0))
                this.body.setLinearFactor(new this.physics.ammo.btVector3(1, 1, 1))

                // Friction / Damping
                this.body.setDamping(0.0, 0.0) // Manual velocity control
                this.body.setFriction(0.5)
            } else {
                console.error("Character Physics Body Creation Failed: createBody returned null")
            }
        } catch (e) {
            console.error("Character Init Physics Error", e)
        }
    }

    initMesh() {
        this.mesh = new THREE.Group()
        this.visuals = new THREE.Group()
        this.mesh.add(this.visuals)

        // Offset visuals so (0,0,0) of this.mesh (Physics Center) aligns with waist/center
        // Visuals were built with Y=0 as feet.
        // Capsule Height ~1.8, Center ~0.9.
        // So we shift visuals down by 0.9
        this.visuals.position.y = -0.9

        // Materials (Matte / Rubber looking)
        const skinMat = new THREE.MeshStandardMaterial({ color: '#ffcc80', roughness: 0.3 })
        const shirtMat = new THREE.MeshStandardMaterial({ color: '#ff7043', roughness: 0.5 })
        const pantsMat = new THREE.MeshStandardMaterial({ color: '#1e88e5', roughness: 0.5 })

        // Helper to make spheres
        const createSphere = (r, x, y, z, mat) => {
            const geo = new THREE.SphereGeometry(r, 16, 16)
            const m = new THREE.Mesh(geo, mat)
            m.position.set(x, y, z)
            m.castShadow = true
            return m
        }

        // Head
        this.head = createSphere(0.35, 0, 1.8, 0, skinMat)
        this.visuals.add(this.head)

        // Torso (Stacked spheres or Capsule)
        // Upper Body
        this.bodyTop = createSphere(0.4, 0, 1.3, 0, shirtMat)
        this.visuals.add(this.bodyTop)
        // Lower Body
        this.bodyBot = createSphere(0.42, 0, 0.9, 0, shirtMat)
        this.visuals.add(this.bodyBot)

        // Arms (Shoulder pads + hands)
        this.armL = createSphere(0.2, -0.45, 1.3, 0, shirtMat)
        this.visuals.add(this.armL)
        this.armR = createSphere(0.2, 0.45, 1.3, 0, shirtMat)
        this.visuals.add(this.armR)

        // Legs (Pivoting group)
        this.legLGroup = new THREE.Group()
        this.legLGroup.position.set(-0.2, 0.8, 0)

        const legGeo = new THREE.CapsuleGeometry(0.15, 0.5, 4, 8)
        this.legLMesh = new THREE.Mesh(legGeo, pantsMat)
        this.legLMesh.position.y = -0.3
        this.legLMesh.castShadow = true
        this.legLGroup.add(this.legLMesh)
        this.visuals.add(this.legLGroup)

        this.legRGroup = new THREE.Group()
        this.legRGroup.position.set(0.2, 0.8, 0)

        this.legRMesh = new THREE.Mesh(legGeo, pantsMat)
        this.legRMesh.position.y = -0.3
        this.legRMesh.castShadow = true
        this.legRGroup.add(this.legRMesh)
        this.visuals.add(this.legRGroup)

        this.scene.add(this.mesh)
    }

    setControls() {
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false
        }

        window.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'ArrowUp': this.keys.up = true; break
                case 'ArrowDown': this.keys.down = true; break
                case 'ArrowLeft': this.keys.left = true; break
                case 'ArrowRight': this.keys.right = true; break
            }
        })

        window.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'ArrowUp': this.keys.up = false; break
                case 'ArrowDown': this.keys.down = false; break
                case 'ArrowLeft': this.keys.left = false; break
                case 'ArrowRight': this.keys.right = false; break
            }
        })
    }

    update() {
        // Fallback if no physics body (Physics failed or loading)
        if (!this.body) {
            // Simple fallback movement (copied from old logic briefly)
            // or just return to avoid crash, but allow camera to see something?
            // Let's just allow minimal movement or return. 
            // If we return, camera is static.
            // Let's implement simple non-physics fallback.

            let moving = false
            this.speed = 0.15 // Reset speed
            if (this.keys.up || this.keys.down || this.keys.left || this.keys.right) {
                const camera = this.game.camera
                const forward = new THREE.Vector3()
                camera.getWorldDirection(forward)
                forward.y = 0
                forward.normalize()

                const right = new THREE.Vector3()
                right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

                let dx = 0
                let dy = 0 // dz in 2d logic, but we use x/z

                if (this.keys.up) {
                    dx += forward.x
                    dy += forward.z
                    moving = true
                }
                if (this.keys.down) {
                    dx -= forward.x
                    dy -= forward.z
                    moving = true
                }
                if (this.keys.right) {
                    dx += right.x
                    dy += right.z
                    moving = true
                }
                if (this.keys.left) {
                    dx -= right.x
                    dy -= right.z
                    moving = true
                }

                if (moving) {
                    // Normalize
                    const len = Math.sqrt(dx * dx + dy * dy)
                    dx /= len
                    dy /= len

                    this.mesh.position.x += dx * this.speed
                    this.mesh.position.z += dy * this.speed

                    // Rotation
                    const angle = Math.atan2(dx, dy)
                    this.mesh.rotation.y = angle
                }
            }

            // Restrict to Land (Radius ~50) for Fallback
            const maxRadius = 49.5
            const cx = this.mesh.position.x
            const cz = this.mesh.position.z
            const distSq = cx * cx + cz * cz
            if (distSq > maxRadius * maxRadius) {
                const dist = Math.sqrt(distSq)
                const ratio = maxRadius / dist
                this.mesh.position.x *= ratio
                this.mesh.position.z *= ratio
            }

            // Snap to ground basic
            const x = this.mesh.position.x
            const z = this.mesh.position.z
            let groundY = -0.5
            if (this.game.map && this.game.map.getHeightAt) {
                groundY = this.game.map.getHeightAt(x, z) - 0.5
            }
            this.mesh.position.y = groundY

            // Animation (Simple)
            if (moving) {
                const time = Date.now() * 0.012
                this.legLGroup.rotation.x = Math.sin(time) * 0.6
                this.legRGroup.rotation.x = Math.sin(time + Math.PI) * 0.6
            }
            return
        }

        const velocity = this.body.getLinearVelocity()
        const currentY = velocity.y()
        const debugPos = this.body.getWorldTransform().getOrigin()

        // Debug Log every ~1s (assuming 60fps)
        if (!this.logTimer) this.logTimer = 0
        this.logTimer++
        if (this.logTimer > 60) {
            console.log("Char Update: Pos", debugPos.x().toFixed(2), debugPos.y().toFixed(2), debugPos.z().toFixed(2), "VelY", currentY.toFixed(2), "Keys", JSON.stringify(this.keys))
            this.logTimer = 0
        }

        // Input Vector
        let moveX = 0
        let moveZ = 0
        let moving = false

        if (this.keys.up || this.keys.down || this.keys.left || this.keys.right) {
            const camera = this.game.camera
            const forward = new THREE.Vector3()
            // Get direction camera is looking (in world space)
            camera.getWorldDirection(forward)
            forward.y = 0 // Flatten to ground
            forward.normalize()

            // Calculate Right vector (Forward x Up)
            const right = new THREE.Vector3()
            right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

            if (this.keys.up) {
                moveX += forward.x
                moveZ += forward.z
                moving = true
            }
            if (this.keys.down) {
                moveX -= forward.x
                moveZ -= forward.z
                moving = true
            }
            if (this.keys.right) {
                moveX += right.x
                moveZ += right.z
                moving = true
            }
            if (this.keys.left) {
                moveX -= right.x
                moveZ -= right.z
                moving = true
            }
        }

        // Normalize
        if (moving) {
            const length = Math.sqrt(moveX * moveX + moveZ * moveZ)
            moveX /= length
            moveZ /= length

            // Set Rotation based on movement
            const angle = Math.atan2(moveX, moveZ)
            // Physics rotation? We locked X/Z angular factor. 
            // We can set transform rotation directly for facing?
            // Actually Physics.update() overwrites mesh rotation from body.
            // So we must rotate the body.
            // But we don't want torque, we want instant facing? 
            // Or we just rotate the mesh visually?
            // Wait, Physics.update sets mesh.quaternion from body. 
            // So we MUST rotate the body.

            const q = new THREE.Quaternion()
            q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle)

            const ammoQ = new this.physics.ammo.btQuaternion(q.x, q.y, q.z, q.w)
            const params = this.body.getWorldTransform()
            params.setRotation(ammoQ)
            this.body.setWorldTransform(params)
        }

        // Apply Velocity
        // Keep Y velocity for gravity (unless handled manually?)
        // Physics handles gravity.

        // Desired X/Z velocity
        let targetSpeed = this.speed

        // Water Logic? (Simplified or Raycast?)
        // Physics handles collision with ground.
        // Water is at -1.2.
        // We can check body position.
        const pos = this.body.getWorldTransform().getOrigin()
        if (pos.y() < -0.5) {
            // Underwater / wading
            targetSpeed *= 0.5
            // Buoyancy?
            if (pos.y() < -1.5) {
                // Float up
                this.body.applyCentralForce(new this.physics.ammo.btVector3(0, 20, 0))
            }
        }

        const desiredX = moveX * targetSpeed
        const desiredZ = moveZ * targetSpeed

        // Restrict to Land (Radius ~50)
        // We set logical limit slightly inside visual boundary (50) to account for character radius (0.4)
        const maxRadius = 49.5
        const currentPos = this.body.getWorldTransform().getOrigin()
        let currentX = currentPos.x()
        const currentZ = currentPos.z()
        let distSq = currentX * currentX + currentZ * currentZ

        // 1. Clamp Position if already outside
        if (distSq > maxRadius * maxRadius) {
            const dist = Math.sqrt(distSq)
            const ratio = maxRadius / dist

            // Correct position
            currentX *= ratio
            // currentZ *= ratio // Wait, currentZ is const in this scope? No let's fix variables
            // We need to write back to ammo body

            const correctedZ = currentZ * ratio

            // Update Ammo Body Transform
            const transform = this.body.getWorldTransform()
            transform.setOrigin(new this.physics.ammo.btVector3(currentX, currentPos.y(), correctedZ))
            this.body.setWorldTransform(transform)

            // Update local vars for velocity calc
            distSq = maxRadius * maxRadius
        }

        let finalVx = desiredX
        let finalVz = desiredZ

        // 2. Velocity Restriction (Prevent moving out)
        if (distSq >= (maxRadius - 0.1) * (maxRadius - 0.1)) {
            // We are at edge
            const dist = Math.sqrt(distSq)
            const normalX = currentX / dist
            const normalZ = (currentZ * (maxRadius / dist)) / maxRadius // Simplified: just use currentZ/dist if we updated currentZ
            // Actually re-calculate normal based on currentX/currentZ which might be clamped
            // But currentPos.z() was original. 
        }

        // Let's rewrite cleaner:

        let activeX = currentPos.x()
        let activeZ = currentPos.z()
        let activeDistSq = activeX * activeX + activeZ * activeZ

        if (activeDistSq > maxRadius * maxRadius) {
            const dist = Math.sqrt(activeDistSq)
            const ratio = maxRadius / dist
            activeX *= ratio
            activeZ *= ratio

            const transform = this.body.getWorldTransform()
            transform.setOrigin(new this.physics.ammo.btVector3(activeX, currentPos.y(), activeZ))
            this.body.setWorldTransform(transform)
            activeDistSq = maxRadius * maxRadius
        }

        let vX = desiredX
        let vZ = desiredZ

        if (activeDistSq > (maxRadius - 0.5) * (maxRadius - 0.5)) {
            const dist = Math.sqrt(activeDistSq)
            const nX = activeX / dist
            const nZ = activeZ / dist

            const dot = vX * nX + vZ * nZ
            if (dot > 0) {
                vX -= dot * nX
                vZ -= dot * nZ
            }
        }

        this.body.setLinearVelocity(new this.physics.ammo.btVector3(vX, currentY, vZ))

        // Animation
        if (moving) {
            const time = Date.now() * 0.012
            // Swing Legs
            this.legLGroup.rotation.x = Math.sin(time) * 0.6
            this.legRGroup.rotation.x = Math.sin(time + Math.PI) * 0.6

            const bob = Math.sin(time * 2) * 0.03
            // Apply bob
            this.head.position.y = 1.8 + bob
            this.bodyTop.position.y = 1.3 + bob
            this.bodyBot.position.y = 0.9 + bob
            this.armL.position.y = 1.3 + bob
            this.armR.position.y = 1.3 + bob

        } else {
            this.legLGroup.rotation.x = 0
            this.legRGroup.rotation.x = 0

            // Reset Bob
            this.head.position.y = 1.8
            this.bodyTop.position.y = 1.3
            this.bodyBot.position.y = 0.9
            this.armL.position.y = 1.3
            this.armR.position.y = 1.3
        }
    }
}
