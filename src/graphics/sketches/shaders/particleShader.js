export const particleShader = /* wgsl */`

    struct Camera {
        projection: mat4x4f,
        view: mat4x4f,
        quaternion: vec4f,
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

        var pos = in.position.xyz * 0.005;

        // apply quaternion
        pos = applyQuaternion( camera.quaternion, pos );

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