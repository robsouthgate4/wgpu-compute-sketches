import { sceneSettings } from "../../../globals/constants";

export const particleDepthShader = /* wgsl */`

    struct Light {
        projection: mat4x4f,
        view: mat4x4f
    };

    @group(0) @binding(0) var<uniform> light : Light;
    @group(0) @binding(1) var<uniform> model : mat4x4f;

    struct VertexInput {
        @location(0) position: vec3f,
        @location(1) offset: vec4f,
    };

    struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
    };

    @vertex fn vs( in: VertexInput ) -> VertexOutput {
        var out: VertexOutput;

        var pos = in.position.xyz * ${sceneSettings.PARTICLE_SCALE};

        //pos += in.offset.xyz;

        var mvPosition = light.view * model * vec4(in.offset.xyz, 1);

        mvPosition.x += pos.x;
        mvPosition.y += pos.y;
        mvPosition.z += pos.z;

        var mvp = light.projection * mvPosition;

        out.position = mvp;
        out.uv       = in.position.xy * 2.;

        return out;
    }

    @fragment fn fs( in: VertexOutput ) -> @location(0) vec4f {

        var mask = 1.0 - step( 0.55, length(in.uv + vec2( 0.0, 0.3 )) );

        if( mask < 0.5 ) {
            discard;
        }

        return vec4( 1.0 );
    }
    
`