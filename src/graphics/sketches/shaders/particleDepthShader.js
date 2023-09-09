import { applyQuaternion } from "./shader-lib/applyQuaternion";

export const shadowDepthShader = /* wgsl */`

    struct Light {
        projection: mat4x4f,
        view: mat4x4f,
        quaternion: vec4f,
    };

    @group(0) @binding(0) var<uniform> light : Light;
    @group(0) @binding(1) var<uniform> model : mat4x4f;

    struct VertexInput {
        @location(0) position: vec3f,
        @location(1) offset: vec4f,
        @location(2) lifetime: f32
    };

    struct VertexOutput {
        @builtin(position) position: vec4f
    };

    ${applyQuaternion} // include quaternion function

    @vertex fn vs( in: VertexInput ) -> VertexOutput {
        var out: VertexOutput;

        var pos = in.position.xyz * 0.013;

        // apply quaternion
        pos = -applyQuaternion( light.quaternion, pos );

        pos += in.offset.xyz;

        var mvp = light.projection * light.view * model;

        out.position = mvp * vec4(pos.xyz, 1);

        return out;
    }
    
`