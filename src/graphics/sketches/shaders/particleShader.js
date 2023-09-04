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
        @location(1) offset: vec4f,
        @location(2) lifetime: f32
    };

    struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
        @location(1) shadowCoord: vec3f
    };

   fn applyQuaternion( q: vec4f, v: vec3f ) -> vec3f {
        var x = v.x;
        var y = v.y;
        var z = v.z;

        var qx = q.x;
        var qy = q.y;
        var qz = q.z;
        var qw = q.w;

        // calculate quat * vector

        var ix = qw * x + qy * z - qz * y;
        var iy = qw * y + qz * x - qx * z;
        var iz = qw * z + qx * y - qy * x;
        var iw = - qx * x - qy * y - qz * z;

        // calculate result * inverse quat

        var xx = ix * qw + iw * - qx + iy * - qz - iz * - qy;
        var yy = iy * qw + iw * - qy + iz * - qx - ix * - qz;
        var zz = iz * qw + iw * - qz + ix * - qy - iy * - qx;

        return vec3( xx, yy, zz );
   }

    @vertex fn vs( in: VertexInput ) -> VertexOutput {
        var out: VertexOutput;

        var posFromLight = light.projection * light.view * model * vec4(in.position.xyz, 1);

        out.shadowCoord = vec3(
            posFromLight.xy * vec2(0.5 - 0.5) + vec2(0.5),
            posFromLight.z
        );

        var pos = in.position.xyz * 0.012;

        // apply quaternion
        pos = applyQuaternion( camera.quaternion, pos );

        pos += in.offset.xyz;

        // billboard the particles
        var mvp = camera.projection * camera.view * model;

        out.position = mvp * vec4(pos.xyz, 1);
        out.color = vec4( 0.0, 0.0, 0.0, 1.0 );
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

        var shadow = textureSampleCompare(
            shadowMap, shadowSampler,
            in.shadowCoord.xy, in.shadowCoord.z - 0.007
        );

        return vec4( 1.0, 0.0, 0.0, 1.0 );
    }
`