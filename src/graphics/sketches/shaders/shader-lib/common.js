export const linearizeDepth = /* wgsl */ `
    fn linearizeDepth(depth: f32, near: f32, far: f32) -> f32 {
        return (2.0 * near) / (far + near - depth * (far - near));
    }
`;