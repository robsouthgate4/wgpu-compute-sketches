export const particleShader = /* wgsl */`

    struct Camera {
        projection: mat4x4f,
        view: mat4x4f
    };

    @group(0) @binding(0) var<uniform> camera : Camera;
    @group(0) @binding(1) var<uniform> model : mat4x4f;

    struct VertexInput {
        @location(0) position: vec3f,
        @location(1) offset: vec4f,
        @location(2) lifetime: f32
    };

    struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
    };

    @vertex fn vs( in: VertexInput ) -> VertexOutput {
        var out: VertexOutput;

        var pos = in.position.xyz * 0.005;

        pos += in.offset.xyz;

        var modelView = camera.view * model;

        // billboard the particles
        var mvp = camera.projection * modelView;

        out.position = mvp * vec4(pos.xyz, 1);
        out.color = vec4( 0.8, 0.8, 0.8, 0.0 );
        return out;
    }

    @fragment fn fs( in: VertexOutput ) -> @location(0) vec4f {
        return vec4( in.color );
    }
`