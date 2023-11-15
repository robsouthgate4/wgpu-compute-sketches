import { sceneSettings } from "../../../globals/constants";
import { noiseFunctions } from "./shader-lib/noiseFunctions";

export const computeShader = (WORK_GROUP_SIZE = 64) => /* wgsl */`

    struct Uniforms {
        time: f32,
        delta: f32,
        curlTime: f32,
        seed: f32,
        meshIndicesCount: f32,
    }

    struct Particle {
        pos: vec3<f32>,
        vel: vec3<f32>,
        life: f32
    };

    struct StartData {
        pos: vec3<f32>,
        life: f32
    }

    @group(0) @binding(0) var<storage, read> startData: array<StartData>;
    @group(0) @binding(1) var<storage, read_write> particles: array<Particle>;
    @group(0) @binding(2) var<uniform> uniforms: Uniforms;

    @group(0) @binding(3) var<storage, read> scatterVertices: array<f32>;
    @group(0) @binding(4) var<storage, read> scatterIndices: array<u32>;

    @group(0) @binding(5) var<storage, read> scatterJoints: array<mat4x4f>;
    @group(0) @binding(6) var<storage, read> scatterWeights: array<f32>;
    @group(0) @binding(7) var<storage, read> scatterJointIndices: array<u32>;
    
    ${noiseFunctions()}

    fn rand(co: vec2<f32>) -> f32{
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    fn getPosition(index: u32) -> vec3f {
        let offset = index * 3;
        return vec3f(scatterVertices[offset],
                     scatterVertices[offset + 1],
                     scatterVertices[offset + 2]);
    }

    fn getJoints(index: u32) -> vec4u {
        let offset = index * 4;
        return vec4u(scatterJointIndices[offset],
                     scatterJointIndices[offset + 1],
                     scatterJointIndices[offset + 2],
                     scatterJointIndices[offset + 3]);
    }

    fn getWeights(index: u32) -> vec4f {
        let offset = index * 4;
        return vec4f(scatterWeights[offset],
                     scatterWeights[offset + 1],
                     scatterWeights[offset + 2],
                     scatterWeights[offset + 3]);
    }

    fn getJoints8(index: u32) -> vec4u {
        let offset = index * 4;
        let packedJoints = scatterJointIndices[offset];
        return vec4u((packedJoints & 0xFF),
                     (packedJoints & 0xFF00) >> 8,
                     (packedJoints & 0xFF0000) >> 16,
                     (packedJoints & 0xFF000000) >> 24);
    }

    fn getSkinMatrix(joints: vec4u, weights: vec4f) -> mat4x4f {
        let joint0 = scatterJoints[joints.x];
        let joint1 = scatterJoints[joints.y];
        let joint2 = scatterJoints[joints.z];
        let joint3 = scatterJoints[joints.w];
      
        return joint0 * weights.x +
               joint1 * weights.y +
               joint2 * weights.z +
               joint3 * weights.w;
    }

    

    @compute @workgroup_size(${WORK_GROUP_SIZE}) fn computeMain(
    @builtin(global_invocation_id) cell: vec3<u32>
    ) {
        var i = cell.x;
        
        if (i >= ${sceneSettings.PARTICLE_COUNT}) { return; }

        var currentLife = particles[i].life;

        var vert = getPosition(i);

        var skinMatrix = getSkinMatrix(getJoints8(i), getWeights(i));
        
        particles[i].pos = ( skinMatrix * vec4f( vert, 1.0 ) ).xyz;
        //particles[i].pos = vert;

        // if( currentLife > 1 ) {

        //     var seed = uniforms.seed + uniforms.time;

        //      // Use particle's ID for randomness
        //     var randomValue1 = simplexNoise2(vec2(f32(i) + seed, f32(i) + seed)) + 0.5; // arbitrary constant for variation
        //     var randomValue2 = simplexNoise2(vec2(f32(i + 2) + seed, f32(i + 2) + seed)) + 0.5; // another arbitrary constant for variation

        //     // Select a random triangle using the index buffer
        //     var triangleCount = i32(uniforms.meshIndicesCount);
        //     var randomTriangleIndex = i32(randomValue1 * f32(triangleCount)) % triangleCount;

        //     var indexA = scatterIndices[randomTriangleIndex * 3];
        //     var indexB = scatterIndices[randomTriangleIndex * 3 + 1];
        //     var indexC = scatterIndices[randomTriangleIndex * 3 + 2];

        //     var vertexA = vec3(scatterVertices[indexA * 3], scatterVertices[indexA * 3 + 1], scatterVertices[indexA * 3 + 2]);
        //     var vertexB = vec3(scatterVertices[indexB * 3], scatterVertices[indexB * 3 + 1], scatterVertices[indexB * 3 + 2]);
        //     var vertexC = vec3(scatterVertices[indexC * 3], scatterVertices[indexC * 3 + 1], scatterVertices[indexC * 3 + 2]);

        //     var u = randomValue2;
        //     var v = ((simplexNoise2(vec2(randomValue2, randomValue1 + f32(i)))) * 0.5 + 0.5) * (1.0 - u);  // use another hash for variation
        //     var w = 1.0 - u - v;

        //     var randomPosition = u * vertexA + v * vertexB + w * vertexC;
            
        //     var startPos = randomPosition;

        //     //startPos.x += sin( uniforms.time * 2 ) * 1;

        //     // reset particle
        //     particles[i].pos = startPos; //+ (curlNoise(startPos * 1. + (sin( uniforms.time * 10 ) * 10)) * 0.001);
        //     // particles[i].vel = vec3(99, 99, 99);
        //     particles[i].life = startData[i].life;	
        //     // move particle
        // }else {
        //     var curl = curlNoise(particles[i].pos * 3.) * 0.2175;

        //     //particles[i].vel += vec3(0, -0.0001, 0);
        //     particles[i].pos += curl * uniforms.delta;
        //     particles[i].pos.y -= 0.34 * uniforms.delta;
        //     particles[i].pos.z -= 0.34 * uniforms.delta;
        //     particles[i].life += 0.00625;
        // }

    }
`;