
struct ViewData {
    view: mat4x4<f32>,
    projection: mat4x4<f32>,
}

struct NodeData {
    model: mat4x4<f32>,
    normal: mat4x4<f32>,
    modelViewProjection: mat4x4<f32>,
}

struct UniformData {
    color1: vec4<f32>,
    color2: vec4<f32>,
    color3: vec4<f32>,
    segments: vec2<f32>,
    time: vec2<f32>,
    instancePositions: vec3<f32>
}

@group(0) @binding(0) var<uniform> viewData: ViewData;
@group(1) @binding(0) var<uniform> nodeData: NodeData;
@group(2) @binding(0) var<uniform> uniformData: UniformData;

struct VSInput {
    @location(0) position: vec4f,
    @location(1) normal: vec4f,
    @location(2) uv: vec2f,
    @location(3) angle: f32,
    @builtin(instance_index) instance: u32
};

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec4f,
    @location(1) localPosition: vec4f
};

fn sample(t: f32, time: f32, index: f32) -> vec3<f32> {
    
    var x = 0.0001;
    var y = t * 2.0 - 1.0;
    var z = 0.0;
    return vec3<f32>(x, y, z);
}
  
@vertex
fn vsMain(v: VSInput) -> VSOutput {
    var output : VSOutput;

    let i = f32(v.instance);
    
    var newPos = vec3<f32>(0.0, 0.0, 0.0);
    var newNormal = vec3<f32>(0.0, 0.0, 0.0);

    var t = (v.position.y * 2.0) * 0.5 + 0.5;
    var volume = vec2<f32>(0.05, 0.05);

    //volume *= radiusGradient;

    var nextT = t + (1.0 / uniformData.segments.y);

    var cur = sample(t, uniformData.time.x, i);
    var next = sample(nextT, uniformData.time.x, i);

    var T = normalize(next - cur);
    var B = normalize(cross(T, next + cur));
    var N = normalize(cross(B, T));

    var tubeAngle = v.angle;
    var circX = cos(tubeAngle);
    var circY = sin(tubeAngle);

    newNormal = normalize(B * circX + N * circY);
    newPos = cur + B * volume.x * circX + N * volume.y * circY;

    var pos = vec4( newPos, 1.0 );

    //if(v.instance != 0) {
        pos.x += uniformData.instancePositions[v.instance + 0];
        pos.y += uniformData.instancePositions[v.instance + 1];
        // pos.z += uniformData.instancePositions[v.instance + 2];
    //}


    output.position = viewData.projection * viewData.view * nodeData.model * pos;
    output.normal = nodeData.normal * vec4( newNormal, 0.0 );

    return output;
};
    
@fragment
fn fsMain(v: VSOutput) -> @location(0) vec4<f32> {
    return vec4(v.normal.xyz * 0.5 + 0.5, 1.0);
};