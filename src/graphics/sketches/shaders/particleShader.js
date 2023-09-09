import { applyQuaternion } from "./shader-lib/applyQuaternion";
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
    @group(0) @binding(4) var shadowSampler: sampler;


    struct VertexInput {
        @location(0) position: vec3f,
        @location(1) offset: vec4f,
        @location(2) lifetime: f32
    };

    struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
        @location(1) shadowCoord: vec3f,
        @location(2) lightSpacePos: vec4f,
        @location(3) uv: vec2f
    };

   ${applyQuaternion} // include quaternion function
   ${shadowCalculation} // include shadow calculation function

    @vertex fn vs( in: VertexInput ) -> VertexOutput {
        var out: VertexOutput;

        var pos = in.position.xyz * 0.018;
        
        // apply quaternion
        pos = applyQuaternion( camera.quaternion, pos );
        
        pos += in.offset.xyz;

        var posFromLight = light.projection * light.view * model * vec4(pos, 1);

        // billboard the particles
        var mvp = camera.projection * camera.view * model;

        out.position      = mvp * vec4(pos.xyz, 1);
        out.lightSpacePos = posFromLight;
        out.color         = vec4( 0.0, 0.0, 0.0, 1.0 );
        out.uv           = in.position.xy * 2.;
        return out;
    }

    @fragment fn fs( in: VertexOutput ) -> @location(0) vec4f {

        var shadow    = shadowCalculation(in.lightSpacePos, shadowMap, shadowSampler, 1024., 1.);

        var shadowCol = vec3(0.6);
        var meshCol   = vec3(1.0);
        var outCol    = mix(meshCol, shadowCol, shadow);

        var mask = 1.0 - step( 0.55, length(in.uv + vec2( 0.0, 0.3 )) );

        if( mask < 0.5 ) {
            discard;
        }

        return vec4( outCol, 1.0 );
    }
`