import { curlNoiseShader } from "./curlNoiseShader";

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
    
    ${curlNoiseShader()}

    @compute @workgroup_size(${WORK_GROUP_SIZE}) fn computeMain(
    @builtin(global_invocation_id) cell: vec3<u32>
    ) {
        var i = cell.x;

        var startPos = startData[i].pos;

        var currentLife = particles[i].life;

        // particles[i].pos = startPos;
        // particles[i].life = startData[i].life;
        
        if( currentLife > 1.0 ) {
            // reset particle
            particles[i].life = startData[i].life;	
            particles[i].pos = startPos; //+ (curlNoise(startPos * 1. + (sin( uniforms.time * 10 ) * 10)) * 0.1);
            // move particle
        }else {
            var curl = curlNoise(particles[i].pos * 0.2) * 0.0275;
            particles[i].pos += curl;
            particles[i].pos.y += curl.y * 0.5;
            particles[i].life += 0.008;
        }

    }
`;