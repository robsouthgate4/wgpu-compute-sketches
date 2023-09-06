export const basicShadowShader = /* wgsl */`

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
    @group(0) @binding(5) var samplerTest: sampler;


    struct VertexInput {
        @location(0) position: vec3f,
        @location(1) normal: vec3f,
        @location(2) uv: vec2f,
    };

    struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
        @location(1) normal: vec3f,
        @location(2) uv: vec2f,
        @location(3) lightSpacePos: vec4f
    };

    fn shadowCalculation(fragPos: vec4f) -> f32 {

        var projCoords = fragPos.xyz / fragPos.w;

        projCoords = projCoords * 0.5 + 0.5;

        var closestDepth = textureSample(shadowMap, samplerTest, projCoords.xy);
        var currentDepth = projCoords.z;

        var shadow = 0.0;

        var texelSize = 1.0 / 1024.0;

        for(var x = -1; x <= 1; x++)
        {
            for(var y = -1; y <= 1; y++)
            {
                var offset   = vec2<f32>(vec2(x, y)) * texelSize;
                var pcfDepth = textureSample(shadowMap, samplerTest, projCoords.xy + offset);
                var curr     = currentDepth - 0.005;

                if(curr >= pcfDepth) {
                    shadow += 1.0;
                }
            }    
        }

        shadow /= 9.0;

        if(projCoords.z < 0.0 || projCoords.z > 1.0 || projCoords.x < 0.0 || projCoords.x > 1.0 || projCoords.y < 0.0 || projCoords.y > 1.0) {
            return 0.0;
        }
        

        return shadow;
    }

    @vertex fn vs( in: VertexInput ) -> VertexOutput {
        var out: VertexOutput;

        var worldPosition = (model * vec4(in.position, 1)).xyz;

        var posFromLight = light.projection * light.view * model * vec4(in.position, 1);

        var pos = in.position.xyz;

        var mvp = camera.projection * camera.view * model;

        out.position = mvp * vec4(pos.xyz, 1);
        out.lightSpacePos = posFromLight;
        out.color = vec4( 1.0, 0.0, 0.0, 1.0 );
        out.normal = ( model * vec4( in.normal, 0.0 ) ).xyz;
        out.uv = in.uv;

        return out;
    }

    @fragment fn fs( in: VertexOutput ) -> @location(0) vec4f {

        var  shadow    = shadowCalculation(in.lightSpacePos);
        var  shadowCol = vec3(0.5);
        var  meshCol   = vec3(0.8);
        var outCol    = mix(meshCol, shadowCol, shadow);
        return vec4(outCol, 1);
    }
`