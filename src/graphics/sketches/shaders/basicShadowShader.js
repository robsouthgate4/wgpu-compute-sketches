import { shadowCalculation } from "./shader-lib/shadows";

export const basicShadowShader = /* wgsl */`

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
    @group(0) @binding(4) var samp: sampler;


    struct VertexInput {
        @location(0) position: vec3f,
        @location(1) normal: vec3f,
        @location(2) uv: vec2f,
    };

    struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
        @location(1) normal: vec3f,
        @location(2) uv: vec2f,
        @location(3) lightSpacePos: vec4f
    };

    ${shadowCalculation} // include shadow calculation function

    @vertex fn vs( in: VertexInput ) -> VertexOutput {
        var out: VertexOutput;

        var worldPosition = (model * vec4(in.position, 1)).xyz;

        var posFromLight = light.projection * light.view * model * vec4(in.position, 1);

        var pos = in.position.xyz;

        var mvp = camera.projection * camera.view * model;

        out.position      = mvp * vec4(pos.xyz, 1);
        out.lightSpacePos = posFromLight;
        out.color         = vec4( 1.0, 0.0, 0.0, 1.0 );
        out.normal        = ( model * vec4( in.normal, 0.0 ) ).xyz;
        out.uv            = in.uv;

        return out;
    }

    @fragment fn fs( in: VertexOutput ) -> @location(0) vec4f {

        var shadow    = shadowCalculation(in.lightSpacePos, shadowMap, samp, 2048., 1.5);
        var shadowCol = vec3(0.6);
        var meshCol   = vec3(0.8);
        var outCol    = mix(meshCol, shadowCol, shadow);
        return vec4(outCol, 1);
    }
`