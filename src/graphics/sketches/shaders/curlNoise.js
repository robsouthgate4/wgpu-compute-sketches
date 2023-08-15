export const curlNoise = () => /* wgsl */`

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

`;