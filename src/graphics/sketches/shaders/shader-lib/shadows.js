
export const shadowCalculation = /* wgsl */`

    fn shadowCalculation(fragPos: vec4f, shadowMap: texture_depth_2d, samp: sampler, res: f32, texelSize: f32) -> f32 {

        var projCoords = fragPos.xyz / fragPos.w;

        projCoords = projCoords * 0.5 + 0.5;

        var currentDepth = projCoords.z;

        var shadow = 0.0;

        var offsetSize = texelSize / res;

        var bias = 0.01;

        for(var x = -1; x <= 1; x++)
        {
            for(var y = -1; y <= 1; y++)
            {
                var offset   = vec2<f32>(vec2(x, y)) * offsetSize;
                var pcfDepth = textureSample(shadowMap, samp, projCoords.xy + offset);
                var curr     = currentDepth;

                if(curr - bias > pcfDepth) {
                    shadow += 1.0;
                }
            }    
        }

        shadow /= 9.0;

        // var closestDepth = textureSample(shadowMap, samp, projCoords.xy);

        // if(currentDepth - bias > closestDepth) {
        //     shadow = 1.0;
        // }

        if(projCoords.z < 0.0 || projCoords.z > 1.0 || projCoords.x < 0.0 || projCoords.x > 1.0 || projCoords.y < 0.0 || projCoords.y > 1.0) {
            return 0.0;
        }
        
        return shadow;
    }

`;