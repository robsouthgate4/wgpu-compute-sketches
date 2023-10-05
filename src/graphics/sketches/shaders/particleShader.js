import { sceneSettings } from "../../../globals/constants";
import { shadowCalculation } from "./shader-lib/shadows";

export const particleShader = /* wgsl */`

    struct Camera {
        projection: mat4x4f,
        view: mat4x4f,
        quaternion: vec4f,
    };

    struct Light {
        projection: mat4x4f,
        view: mat4x4f
    };

    @group(0) @binding(0) var<uniform> camera : Camera;
    @group(0) @binding(1) var<uniform> model : mat4x4f;
    @group(0) @binding(2) var<uniform> light : Light;
    @group(0) @binding(3) var shadowMap: texture_depth_2d;
    @group(0) @binding(4) var shadowSampler: sampler_comparison;


    struct VertexInput {
        @location(0) position: vec3f,
        @location(1) offset: vec3f
    };

    struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
        @location(1) lightSpacePos: vec4f,
        @location(2) uv: vec2f,
        @location(3) localPos: vec3f,
    };

    ${shadowCalculation} // include cuntions

    @vertex fn vs( in: VertexInput ) -> VertexOutput {
        var out: VertexOutput;

        var particleScale = ${sceneSettings.PARTICLE_SCALE};   

        var pos = in.position.xyz;

        var mvPosition = camera.view * model * vec4(in.offset.xyz, 1);

        mvPosition.x += pos.x * 0.1;
        mvPosition.y += pos.y * 0.1;
        mvPosition.z += pos.z * 0.1;
        
        var posFromLight = light.projection * light.view * model * vec4(in.offset.xyz, 1);

        posFromLight.x += pos.x * 0.02;
        posFromLight.y += pos.y * 0.02;
        posFromLight.z += pos.z * 0.02;

        // billboard the particles
        var mvp = camera.projection * mvPosition;

        out.position      = mvp;
        out.localPos      = in.offset * 2 - 1;
        out.lightSpacePos = posFromLight;
        out.color         = vec4( 0.0, 0.0, 0.0, 1.0 );
        out.uv            = in.position.xy * 2.;
        return out;
    }

    @fragment fn fs( in: VertexOutput ) -> @location(0) vec4f {

        var shadow    = 1 - shadowCalculation(in.lightSpacePos, shadowMap, shadowSampler, ${sceneSettings.SHADOW_MAP_SIZE}, 2, 0.0003);

        // var N = normalize(in.localPos * 2.0 - 1.0);

        // // create basic diffuse lighting
        // var lightDir = normalize(vec3(0.5, 0.5, 0.5));

        var meshCol   = vec3(0.9);
        var shadowCol = vec3(0.5);
        var outCol    = mix(meshCol, shadowCol, shadow);

        var mask = 1.0 - step( 0.55, length(in.uv + vec2( 0.0, 0.3 )) );

        if( mask < 0.5 ) {
            discard;
        }

        return vec4( outCol, 1.0 );
    }
`