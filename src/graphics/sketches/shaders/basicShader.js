export const basicShader = /* wgsl */`

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
        @location(1) normal: vec3f,
        @location(2) uv: vec2f,
    };

    struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
        @location(1) shadowCoord: vec3f,
        @location(2) normal: vec3f,
        @location(3) uv: vec2f,
    };

    @vertex fn vs( in: VertexInput ) -> VertexOutput {
        var out: VertexOutput;

        // var posFromLight = light.projection * light.view * model * vec4(in.position.xyz, 1);

        // out.shadowCoord = vec3(
        //     posFromLight.xy * vec2(0.5 - 0.5) + vec2(0.5),
        //     posFromLight.z
        // );

        var pos = in.position.xyz;

        var mvp = camera.projection * camera.view * model;

        out.position = mvp * vec4(pos.xyz, 1);
        out.color = vec4( 1.0, 0.0, 0.0, 1.0 );
        out.normal = ( model * vec4( in.normal, 0.0 ) ).xyz;
        out.uv = in.uv;

        return out;
    }

    @fragment fn fs( in: VertexOutput ) -> @location(0) vec4f {

        // var visibility = 0.0;
        // let oneOverShadowDepthTextureSize = 1.0 / 1024.0;
        // for (var y = -1; y <= 1; y++) {
        //     for (var x = -1; x <= 1; x++) {
        //         let offset = vec2<f32>(vec2(x, y)) * oneOverShadowDepthTextureSize;

        //         visibility += textureSampleCompare(
        //             shadowMap, shadowSampler,
        //             in.shadowCoord.xy + offset, in.shadowCoord.z - 0.007
        //         );
        //     }
        // }
        // visibility /= 9.0;

        // var shadow = textureSampleCompare(
        //     shadowMap, shadowSampler,
        //     in.shadowCoord.xy, in.shadowCoord.z - 0.007
        // );

        return vec4(in.normal * 0.5 + 0.5, 1);
    }
`