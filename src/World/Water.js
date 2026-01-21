import * as THREE from 'three'

export default class Water {
    constructor(game) {
        this.game = game
        this.scene = this.game.scene

        this.setGeometry()
        this.setMaterial()
        this.setMesh()
    }

    setGeometry() {
        this.geometry = new THREE.PlaneGeometry(200, 200, 64, 64) // High segment count for waves
    }

    setMaterial() {
        this.material = new THREE.ShaderMaterial({
            vertexShader: `
                uniform float uTime;
                
                varying vec2 vUv;
                varying float vElevation;

                void main() {
                    vUv = uv;
                    
                    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                    
                    float elevation = sin(modelPosition.x * 0.5 + uTime) * 0.2;
                    elevation += sin(modelPosition.z * 0.5 + uTime * 0.5) * 0.2;
                    
                    modelPosition.y += elevation;
                    vElevation = elevation;

                    vec4 viewPosition = viewMatrix * modelPosition;
                    vec4 projectedPosition = projectionMatrix * viewPosition;

                    gl_Position = projectedPosition;
                }
            `,
            fragmentShader: `
                uniform float uTime;
                
                varying vec2 vUv;
                varying float vElevation;

                void main() {
                    vec3 waterColor = vec3(0.1, 0.4, 0.8);
                    vec3 foamColor = vec3(1.0, 1.0, 1.0);
                    
                    float mixStrength = (vElevation + 0.4) * 0.8;
                    vec3 color = mix(waterColor, foamColor, mixStrength); // Simple foam on peaks
                    
                    gl_FragColor = vec4(color, 0.8);
                }
            `,
            transparent: true,
            uniforms: {
                uTime: { value: 0 }
            }
        })
    }

    setMesh() {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.rotation.x = - Math.PI * 0.5
        this.mesh.position.y = -1.2
        this.mesh.receiveShadow = true
        this.scene.add(this.mesh)
    }

    update() {
        this.material.uniforms.uTime.value = this.game.clock.getElapsedTime()
    }
}
