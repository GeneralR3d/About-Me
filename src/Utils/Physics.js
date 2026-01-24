export default class Physics {
    constructor(game) {
        this.game = game
        this.ammo = null
        this.physicsWorld = null
        this.rigidBodies = []
        this.tmpTrans = null // Reusable transform

        this.init()
    }

    async init() {
        // Initialize Ammo
        // We are using the global Ammo script injected in index.html
        try {
            if (typeof window.Ammo !== 'function') {
                console.error("Ammo global not found or not a function")
                return
            }

            // Ammo() returns a promise in the WASM build
            this.ammo = await window.Ammo()

            if (this.ammo) {
                console.log("Ammo Debug: Init success. Keys:", Object.keys(this.ammo).slice(0, 5));
            } else {
                console.error("Ammo Debug: this.ammo is null/undefined after init attempt");
            }
        } catch (e) {
            console.error("Ammo init failed", e)
        }

        if (!this.ammo) {
            console.error("Ammo initialization failed completely.")
            return
        }

        // Setup World
        const collisionConfiguration = new this.ammo.btDefaultCollisionConfiguration()
        const dispatcher = new this.ammo.btCollisionDispatcher(collisionConfiguration)
        const broadphase = new this.ammo.btDbvtBroadphase()
        const solver = new this.ammo.btSequentialImpulseConstraintSolver()

        this.physicsWorld = new this.ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration)
        const gravity = new this.ammo.btVector3(0, -9.8, 0)
        this.physicsWorld.setGravity(gravity)
        console.log("Physics: Gravity set to", gravity.y())

        this.tmpTrans = new this.ammo.btTransform()

        console.log("Physics Initialized")
    }

    createBody(mesh, mass, shape, friction = 0.5) {
        if (!this.ammo) {
            console.warn("Ammo not initialized yet in createBody")
            return null
        }
        if (!this.physicsWorld) {
            console.warn("PhysicsWorld not initialized yet in createBody")
            return null
        }

        const position = mesh.position
        const quaternion = mesh.quaternion

        const transform = new this.ammo.btTransform()
        transform.setIdentity()
        transform.setOrigin(new this.ammo.btVector3(position.x, position.y, position.z))
        transform.setRotation(new this.ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w))

        const motionState = new this.ammo.btDefaultMotionState(transform)

        const localInertia = new this.ammo.btVector3(0, 0, 0)
        if (mass > 0) {
            shape.calculateLocalInertia(mass, localInertia)
        }

        const rbInfo = new this.ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia)
        const body = new this.ammo.btRigidBody(rbInfo)

        body.setFriction(friction)

        this.physicsWorld.addRigidBody(body)

        if (mass > 0) {
            body.setActivationState(4) // Disable deactivation usually
            // Check implicit mass by inverse mass (0 for static, >0 for dynamic)
            // Note: getInvMass might also be missing in some builds? Let's try or skip.
            // safely try:
            try {
                // p.s. getInvMass logic: static body has 0 inv mass. dynamic body has 1/mass.
                // But let's verify if `body` has methods at all.
                console.log("Body added. Mass:", mass)
            } catch (e) { }

            this.rigidBodies.push({ mesh, body })
        }

        return body
    }

    // Create simple box shape
    createBoxShape(width, height, depth) {
        const halfExtents = new this.ammo.btVector3(width * 0.5, height * 0.5, depth * 0.5)
        return new this.ammo.btBoxShape(halfExtents)
    }

    // Create capsule shape
    createCapsuleShape(radius, height) {
        return new this.ammo.btCapsuleShape(radius, height)
    }

    createCylinderShape(radius, height) {
        const halfExtents = new this.ammo.btVector3(radius, height * 0.5, radius)
        return new this.ammo.btCylinderShape(halfExtents)
    }

    // Creates a cylinder rotated 90 degrees on X to match CircleGeometry (Z-up)
    createDiscShape(radius, height) {
        const cylinder = this.createCylinderShape(radius, height)

        const compound = new this.ammo.btCompoundShape()
        const transform = new this.ammo.btTransform()
        transform.setIdentity()

        // Rotate 90 degrees on X to align Y-axis cylinder to Z-axis
        const q = new this.ammo.btQuaternion()
        q.setEulerZYX(0, 0, Math.PI / 2) // setEulerZYX takes (yaw, pitch, roll) -> (Z, Y, X)? 
        // Docs say setEulerZYX(z, y, x). So roll is X.
        // Or uses setRotation with quaternion.
        // Let's use setFromAxisAngle if available or setRotation.
        // In Ammo/Bullet, setEulerZYX is (yaw, pitch, roll) around Y, X, Z? Or Z, Y, X.
        // standard is Z, Y, X.
        // Let's rely on setRotation with a quaternion created from Axis Angle.

        // Quat from Axis X, 90 deg.
        // q = [sin(45)*1, 0, 0, cos(45)]
        const angle = Math.PI / 2
        const s = Math.sin(angle / 2)
        q.setX(s)
        q.setY(0)
        q.setZ(0)
        q.setW(Math.cos(angle / 2))

        transform.setRotation(q)

        compound.addChildShape(transform, cylinder)
        return compound
    }

    createTerrainBody(mesh, width, depth, widthSegments, depthSegments, heightData, minHeight, maxHeight) {
        if (!this.ammo) return

        const dataLength = widthSegments * depthSegments
        const dataBytes = dataLength * 4
        const dataPtr = this.ammo._malloc(dataBytes)

        const dataHeap = new Float32Array(this.ammo.HEAPF32.buffer, dataPtr, dataLength)
        dataHeap.set(heightData)

        const heightScale = 1
        const upAxis = 1 // Y
        const hdt = "PHY_FLOAT"
        const flipQuadEdges = false;

        const terrainShape = new this.ammo.btHeightfieldTerrainShape(
            widthSegments,
            depthSegments,
            dataPtr,
            heightScale,
            minHeight,
            maxHeight,
            upAxis,
            hdt,
            flipQuadEdges
        )

        const scaleX = width / (widthSegments - 1)
        const scaleZ = depth / (depthSegments - 1)
        terrainShape.setLocalScaling(new this.ammo.btVector3(scaleX, 1, scaleZ))

        // Fix centering offset
        // btHeightfieldTerrainShape centers the AABB at local origin.
        // So a value 'h' becomes 'h - (min + max)/2' in local space.
        // We want it to be 'h'.
        // So we offset the shape by +(min + max)/2.
        const midHeight = (minHeight + maxHeight) / 2

        const compoundShape = new this.ammo.btCompoundShape()
        const offset = new this.ammo.btTransform()
        offset.setIdentity()
        offset.setOrigin(new this.ammo.btVector3(0, midHeight, 0))

        compoundShape.addChildShape(offset, terrainShape)

        const body = this.createBody(mesh, 0, compoundShape)

        return body
    }

    update(deltaTime) {
        if (!this.physicsWorld) return

        this.physicsWorld.stepSimulation(deltaTime, 10)

        // Debug Log only occasionally
        if (!this.logTimer) this.logTimer = 0
        this.logTimer++
        if (this.logTimer > 120) {
            console.log("Physics Step. dt:", deltaTime.toFixed(4), "Bodies:", this.rigidBodies.length)
            if (this.rigidBodies.length > 0) {
                const b = this.rigidBodies[0].body
                const t = b.getWorldTransform().getOrigin()
                console.log("Body0 Physic Pos:", t.x().toFixed(2), t.y().toFixed(2), t.z().toFixed(2))
            }
            this.logTimer = 0
        }

        // Sync bodies
        for (let i = 0; i < this.rigidBodies.length; i++) {
            const obj = this.rigidBodies[i]
            const ms = obj.body.getMotionState()

            if (ms) {
                ms.getWorldTransform(this.tmpTrans)
                const p = this.tmpTrans.getOrigin()
                const q = this.tmpTrans.getRotation()

                obj.mesh.position.set(p.x(), p.y(), p.z())
                obj.mesh.quaternion.set(q.x(), q.y(), q.z(), q.w())
            }
        }
    }
}
