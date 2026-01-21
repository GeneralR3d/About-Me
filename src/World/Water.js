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
                    
                    float elevation = sin(modelPosition.x * 0.4 + uTime * 1.2) * 0.4;
                    elevation += sin(modelPosition.z * 0.3 + uTime * 0.8) * 0.4;
                    elevation += sin(modelPosition.x * 1.5 + uTime * 0.5) * 0.1; // Small Detail
                    elevation -= cos(modelPosition.z * 2.0 + uTime * 2.0) * 0.1; // Choppiness
                    
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
                    // Pacific Dark Blue
                    vec3 deepColor = vec3(0.0, 0.05, 0.2);
                    vec3 surfaceColor = vec3(0.0, 0.2, 0.5);
                    vec3 foamColor = vec3(1.0, 1.0, 1.0);
                    
                    // Mix deep and surface based on elevation
                    float mixStrength = (vElevation + 1.0) * 0.5;
                    vec3 waterColor = mix(deepColor, surfaceColor, mixStrength);

                    // Foam on peaks (high elevation)
                    float foamStrength = smoothstep(0.6, 1.0, vElevation);
                    vec3 finalColor = mix(waterColor, foamColor, foamStrength);
                    
                    gl_FragColor = vec4(finalColor, 0.9);
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
        this.mesh.position.y = -4
        this.mesh.receiveShadow = true
        this.scene.add(this.mesh)
    }

    update() {
        this.material.uniforms.uTime.value = this.game.clock.getElapsedTime()
    }
}
