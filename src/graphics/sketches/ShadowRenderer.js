
import { shadowDepthShader } from "./shaders/shadowDepthShader";

export default class ShadowRenderer {

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

        const shadowDepthShaderModule = this._device.createShaderModule({
            label: "shadow depth shader module",
            code: shadowDepthShader
        });

        this._vertexBufferLayout = {
			arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
			stepMode: 'vertex',
			attributes: [{
				shaderLocation: 0,
				offset: 0,
				format: "float32x3"
			}]
		}

        const particleInstanceByteSize =
			4 * Float32Array.BYTES_PER_ELEMENT;

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
				},
				{
					// instance lifetime
					shaderLocation: 2,
					offset: 3 * Float32Array.BYTES_PER_ELEMENT,
					format: 'float32',
				}
			],
		}

        this._pipeline = this._device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: shadowDepthShaderModule,
                entryPoint: "vs",
                buffers: [
                    this._vertexBufferLayout,
                    this._particleInstanceLayout
                ]
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth32float",
            },
            primitive: {
                topology: "triangle-list",
            }
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
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "store",
            }
        };

    }

    resize() { }

    update(commandEncoder) {

        const renderPass = commandEncoder.beginRenderPass(this._renderPassDescriptor);

        renderPass.setPipeline(this._pipeline);
        renderPass.setBindGroup(0, this._bindGroup);
        renderPass.setVertexBuffer(0, this._triangleBuffer);
        renderPass.setVertexBuffer(1, this._compute.particleBuffers);
        renderPass.draw(3, this._particleCount, 0, 0);

        renderPass.end();
    }

}