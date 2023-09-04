export const fullScreen = /* wgsl */`

    struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(1) uv: vec2<f32>
    };

    struct Uniforms {
        resolution: vec2<f32>
    };

    @vertex fn vs( @builtin(vertex_index) VertexIndex: u32  ) -> VertexOutput {

        var vsOutput: VertexOutput;

        var vertices = array<vec2<f32>, 3>(
            vec2(-1.0, -1.0),
            vec2(3.0, -1.0),
            vec2(-1.0, 3.0)
        );

        var uvs = array<vec2<f32>, 3>(
            vec2(0.0, 0.0),
            vec2(2.0, 0.0),
            vec2(0.0, 2.0)
        );

        vsOutput.position = vec4<f32>(vertices[VertexIndex], 0.0, 1.0);
        vsOutput.uv = uvs[VertexIndex];

        return vsOutput;

    }
    
    @group(0) @binding(0) var tex: texture_depth_2d;
    @group(0) @binding(1) var sampleTexture: sampler;
    @group(0) @binding(2) var<uniform> uniforms: Uniforms;

    @fragment fn fs( in: VertexOutput ) -> @location(0) vec4<f32> {

        var st = in.uv;

        st.x *= uniforms.resolution.x / uniforms.resolution.y;
        st *= 1.0;
        //st.y -= 1.0;

        if(st.x > 1.0 || st.x < 0.0 || st.y > 1.0 || st.y < 0.0) {
            discard;
        }

        var depth = textureSample(tex, sampleTexture, st);

        return vec4(vec3(depth), 1.0);

    }

`;