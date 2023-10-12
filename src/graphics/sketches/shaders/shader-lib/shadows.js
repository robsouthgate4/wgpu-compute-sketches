
import { linearizeDepth } from "./common";

export const shadowCalculation = /* wgsl */`

    ${linearizeDepth}

    fn shadowCalculation(fragPos: vec4f, shadowMap: texture_depth_2d, samp: sampler_comparison, res: f32, texelSize: f32, bias: f32) -> f32 {

        var shadowPos = vec3(
            fragPos.xy * vec2(0.5, -0.5) + vec2(0.5),
            fragPos.z
        );
        
        var shadow = 0.0;
        
        var offsetSize = texelSize / res;
        
        for(var x = -1; x <= 1; x++)
        {
            for(var y = -1; y <= 1; y++)
            {
                var offset       = vec2<f32>(vec2(x, y)) * offsetSize;
            
                shadow += textureSampleCompare(
                    shadowMap, samp,
                    shadowPos.xy + offset, shadowPos.z - bias
                );
            }    
        }
        
        
        shadow /= 9.0;

        if(shadowPos.x < 0.0 || shadowPos.x > 1.0 || shadowPos.y < 0.0 || shadowPos.y > 1.0) {
            return 1.0;
        }
        
        return shadow;
    }

`;