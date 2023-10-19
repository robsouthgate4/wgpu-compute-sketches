export const noiseFunctions = () => /* wgsl */`

    fn t1() -> f32 {
        return (uniforms.time * uniforms.curlTime) * 0.5432895;
    }

    fn t2() -> f32 {
        return (uniforms.time * uniforms.curlTime) * 9.5432895;
    }

    fn t3() -> f32 {
        return (uniforms.time * uniforms.curlTime) * 4.535463;
    }

    fn t4() -> f32 {
        return -(uniforms.time * uniforms.curlTime) * 1.534534;
    }

    fn t5() -> f32 {
        return (uniforms.time * uniforms.curlTime) * 2.42345;
    }

    fn t6() -> f32 {
        return - (uniforms.time * uniforms.curlTime) * 5.53450;
    }

    fn t7() -> f32 {
        return - (uniforms.time * uniforms.curlTime) * 5.5345354313;
    }

    fn t8() -> f32 {
        return (uniforms.time * uniforms.curlTime) * 4.4234521243;
    }

    fn dP3dY( v: vec3<f32>) -> f32 {
        var noise = 0.0;
        noise += 3. * cos(v.z * 1.8 + v.y * 3. - 194.58 + t1() ) + 4.5 * cos(v.z * 4.8 + v.y * 4.5 - 83.13 + t2() ) + 1.2 * cos(v.z * -7.0 + v.y * 1.2 -845.2 + t3() ) + 2.13 * cos(v.z * -5.0 + v.y * 2.13 - 762.185 + t4() );
        noise += 5.4 * cos(v.x * -0.48 + v.y * 5.4 - 707.916 + t5() ) + 5.4 * cos(v.x * 2.56 + v.y * 5.4 + -482.348 + t6() ) + 2.4 * cos(v.x * 4.16 + v.y * 2.4 + 9.872 + t7() ) + 1.35 * cos(v.x * -4.16 + v.y * 1.35 - 476.747 + t8() );
        return noise;
    }

    fn dP2dZ( v: vec3<f32>) -> f32 {
        return -0.48 * cos(v.z * -0.48 + v.x * 5.4 -125.796 + t5() ) + 2.56 * cos(v.z * 2.56 + v.x * 5.4 + 17.692 + t6() ) + 4.16 * cos(v.z * 4.16 + v.x * 2.4 + 150.512 + t7() ) -4.16 * cos(v.z * -4.16 + v.x * 1.35 - 222.137 + t8() );
    }

    fn dP1dZ( v: vec3<f32>) -> f32 {
        var noise = 0.0;
        noise += 3. * cos(v.x * 1.8 + v.z * 3. + t1() ) + 4.5 * cos(v.x * 4.8 + v.z * 4.5 + t2() ) + 1.2 * cos(v.x * -7.0 + v.z * 1.2 + t3() ) + 2.13 * cos(v.x * -5.0 + v.z * 2.13 + t4() );
        noise += 5.4 * cos(v.y * -0.48 + v.z * 5.4 + t5() ) + 5.4 * cos(v.y * 2.56 + v.z * 5.4 + t6() ) + 2.4 * cos(v.y * 4.16 + v.z * 2.4 + t7() ) + 1.35 * cos(v.y * -4.16 + v.z * 1.35 + t8() );
        return noise;
    }

    fn dP3dX( v: vec3<f32>) -> f32 {
        return -0.48 * cos(v.x * -0.48 + v.y * 5.4 - 707.916 + t5() ) + 2.56 * cos(v.x * 2.56 + v.y * 5.4 + -482.348 + t6() ) + 4.16 * cos(v.x * 4.16 + v.y * 2.4 + 9.872 + t7() ) -4.16 * cos(v.x * -4.16 + v.y * 1.35 - 476.747 + t8() );
    }

    fn dP2dX( v: vec3<f32>) -> f32 {
        var noise = 0.0;
        noise += 3. * cos(v.y * 1.8 + v.x * 3. - 2.82 + t1() ) + 4.5 * cos(v.y * 4.8 + v.x * 4.5 + 74.37 + t2() ) + 1.2 * cos(v.y * -7.0 + v.x * 1.2 - 256.72 + t3() ) + 2.13 * cos(v.y * -5.0 + v.x * 2.13 - 207.683 + t4() );
        noise += 5.4 * cos(v.z * -0.48 + v.x * 5.4 -125.796 + t5() ) + 5.4 * cos(v.z * 2.56 + v.x * 5.4 + 17.692 + t6() ) + 2.4 * cos(v.z * 4.16 + v.x * 2.4 + 150.512 + t7() ) + 1.35 * cos(v.z * -4.16 + v.x * 1.35 - 222.137 + t8() );
        return noise;
    }

    fn dP1dY( v: vec3<f32>) -> f32 {
        return -0.48 * cos(v.y * -0.48 + v.z * 5.4 + t5() ) + 2.56 * cos(v.y * 2.56 + v.z * 5.4 + t6() ) +  4.16 * cos(v.y * 4.16 + v.z * 2.4 + t7() ) -4.16 * cos(v.y * -4.16 + v.z * 1.35 + t8());
    }

    fn curlNoise(p : vec3<f32> ) -> vec3<f32> {
        let x = dP3dY(p) - dP2dZ(p);
        let y = dP1dZ(p) - dP3dX(p);
        let z = dP2dX(p) - dP1dY(p);
        return normalize(vec3<f32>(x, y, z));
    }

    fn mod289(x: vec2f) -> vec2f {
        return x - floor(x * (1. / 289.)) * 289.;
    }

    fn mod289_3(x: vec3f) -> vec3f {
        return x - floor(x * (1. / 289.)) * 289.;
    }

    fn permute3(x: vec3f) -> vec3f {
        return mod289_3(((x * 34.) + 1.) * x);
    }

    //  MIT License. © Ian McEwan, Stefan Gustavson, Munrocket
    fn simplexNoise2(v: vec2f) -> f32 {
        let C = vec4(
            0.211324865405187, // (3.0-sqrt(3.0))/6.0
            0.366025403784439, // 0.5*(sqrt(3.0)-1.0)
            -0.577350269189626, // -1.0 + 2.0 * C.x
            0.024390243902439 // 1.0 / 41.0
        );

        // First corner
        var i = floor(v + dot(v, C.yy));
        let x0 = v - i + dot(i, C.xx);

        // Other corners
        var i1 = select(vec2(0., 1.), vec2(1., 0.), x0.x > x0.y);

        // x0 = x0 - 0.0 + 0.0 * C.xx ;
        // x1 = x0 - i1 + 1.0 * C.xx ;
        // x2 = x0 - 1.0 + 2.0 * C.xx ;
        var x12 = x0.xyxy + C.xxzz;
        x12.x = x12.x - i1.x;
        x12.y = x12.y - i1.y;

        // Permutations
        i = mod289(i); // Avoid truncation effects in permutation

        var p = permute3(permute3(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
        var m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3(0.));
        m *= m;
        m *= m;

        // Gradients: 41 points uniformly over a line, mapped onto a diamond.
        // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)
        let x = 2. * fract(p * C.www) - 1.;
        let h = abs(x) - 0.5;
        let ox = floor(x + 0.5);
        let a0 = x - ox;

        // Normalize gradients implicitly by scaling m
        // Approximation of: m *= inversesqrt( a0*a0 + h*h );
        m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

        // Compute final noise value at P
        let g = vec3(a0.x * x0.x + h.x * x0.y, a0.yz * x12.xz + h.yz * x12.yw);
        return 130. * dot(m, g);
    }

`;