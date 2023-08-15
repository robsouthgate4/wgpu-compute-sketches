import { curlNoise } from "./curlNoise";

export const computeShader = (WORK_GROUP_SIZE = 64) => /* wgsl */`

    struct Uniforms {
        time: f32,
        delta: f32,
        curlTime: f32,
    }

    struct Particle {
        pos: vec3<f32>,
        life: f32
    };

    struct StartData {
        pos: vec3<f32>,
        life: f32
    }

    @group(0) @binding(0) var<storage, read> startData: array<StartData>;
    @group(0) @binding(1) var<storage, read_write> particles: array<Particle>;
    @group(0) @binding(2) var<uniform> uniforms: Uniforms;
    
    ${curlNoise()}

    @compute @workgroup_size(${WORK_GROUP_SIZE}) fn computeMain(
    @builtin(global_invocation_id) cell: vec3<u32>
    ) {
        var i = cell.x;

        var startPos = startData[i].pos;

        var vert1 = startData[i].pos;
        var vert2 = startData[i + 1].pos;
        var vert3 = startData[i + 2].pos;

        // get center of triangle
        var center = (vert1 + vert2 + vert3) / 3.0;

        var currentLife = particles[i].life;

        if( currentLife > 1.0 ) {
            particles[i].life = startData[i].life;	
            particles[i].pos = startPos + (curlNoise(startPos * 100.) * 0.1);
        }else {
            particles[i].pos += curlNoise(particles[i].pos * 0.7) * 0.01;
            particles[i].life += 0.010;
        }

    }
`;