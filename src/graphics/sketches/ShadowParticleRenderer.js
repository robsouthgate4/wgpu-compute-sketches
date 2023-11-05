
import { Cube, Sphere } from "bolt-wgpu";
import { depthShader } from "./shaders/depthShader";
import { particleDepthShader } from "./shaders/particleDepthShader";

export default class ShadowParticleRenderer {

    constructor(bolt, sharedData) {

        this._bolt                 = bolt;
        this._light                = sharedData.light;
        this._compute              = sharedData.compute;
        this._particleCount        = sharedData.particleCount;
        this._lightUniformBuffer   = sharedData.lightUniformBuffer;
        this._nodeUniformBuffer    = sharedData.nodeUniformBuffer;
        this._triangleBuffer       = sharedData.triangleBuffer;
        this._shadowTexture        = sharedData.shadowTexture;
        this._device               = this._bolt.device;
        this._renderPassDescriptor = null;
        this._depthTexture         = null;
        this._renderPassDescriptor = null;
        this.init();

    }

    init() {

        // const cube = new Sphere();
		// console.log(cube);

		// const vertices = new Float32Array(cube.positions);
		// const indices = new Uint32Array(cube.indices);

		// this._indexCount = indices.length;

		// MESH GEOMETRY SETUP
		const vertices = new Float32Array([
			-0.5, -0.5, 0.0,
			0.5, -0.5, 0.0,
			0.0, 0.5, 0.0
		]);

		this._verticesBuffer = this._device.createBuffer({
			label: "Triangle vertices buffer",
			size: vertices.byteLength,
			usage: window.GPUBufferUsage.VERTEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
		})

		this._device.queue.writeBuffer(this._verticesBuffer, 0, vertices);

		// this._indicesBuffer = this._device.createBuffer({
		// 	label: "Triangle indices buffer",
		// 	size: indices.byteLength,
		// 	usage: window.GPUBufferUsage.INDEX | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
		// });

		// this._device.queue.writeBuffer(this._indicesBuffer, 0, indices);

        const shadowDepthShaderModule = this._device.createShaderModule({
            label: "shadow depth shader module",
            code: particleDepthShader
        });

        this._vertexBufferLayout = {
            arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
            stepMode: 'vertex',
            attributes: [{
                shaderLocation: 0,
                offset: 0,
                format: "float32x3"
            }]
        };

        const particleInstanceByteSize =
			3 * Float32Array.BYTES_PER_ELEMENT + // position
			1 * Float32Array.BYTES_PER_ELEMENT + // padding
			3 * Float32Array.BYTES_PER_ELEMENT + // velocity
			1 * Float32Array.BYTES_PER_ELEMENT; // lifetime

        this._particleInstanceLayout = {
            // instanced particles buffer
            arrayStride: particleInstanceByteSize,
            stepMode: 'instance',
            attributes: [
                {
                    // instance offset
                    shaderLocation: 1,
                    offset: 0,
                    format: 'float32x4',
                }
            ]
        }

        this._pipeline = this._device.createRenderPipeline({
            label: "shadow depth pipeline",
            layout: "auto",
            vertex: {
                module: shadowDepthShaderModule,
                entryPoint: "vs",
                buffers: [
                    this._vertexBufferLayout,
                    this._particleInstanceLayout
                ]
            },
            fragment: {
                module: shadowDepthShaderModule,
                entryPoint: "fs",
				targets: []
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth32float",
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "none",
            },
        });

        this._bindGroup = this._device.createBindGroup({
            layout: this._pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this._lightUniformBuffer },
                },
                {
                    binding: 1,
                    resource: { buffer: this._nodeUniformBuffer },
                },
            ],
        });


        this._renderPassDescriptor = {
            colorAttachments: [],
            depthStencilAttachment: {
                view: this._shadowTexture.createView(),
                depthClearValue: 1,
                depthLoadOp: "clear",
                depthStoreOp: "store",
            }
        };

    }

    resize() { }

    render(commandEncoder) {

        const renderPass = commandEncoder.beginRenderPass(this._renderPassDescriptor);

        renderPass.setPipeline(this._pipeline);
		renderPass.setBindGroup(0, this._bindGroup);
		renderPass.setVertexBuffer(0, this._verticesBuffer);
		//renderPass.setIndexBuffer(this._indicesBuffer, "uint32");
		renderPass.setVertexBuffer(1, this._compute.particleBuffer);
		//renderPass.drawIndexed(this._indexCount, this._particleCount);
        renderPass.draw(3, this._particleCount);

        renderPass.end();
    }

}