import { CameraOrtho } from "bolt-wgpu";
import { shadowDepthShader } from "./shaders/shadowDepthShader";

export default class ShadowRenderer {

    constructor(bolt, particleRenderer, compute) {

        this._bolt                 = bolt
        this._device               = this._bolt.device;
        this._particleCount        = 0;
        this._renderPassDescriptor = null;
        this._depthTexture         = null;
        this._textureSize          = 1024;
        this._particleRenderer     = particleRenderer;
        this._light                = null;
        this._renderPassDescriptor = null;
        this._compute              = compute;
        this.init();

    }

    init() {

        this._light = new CameraOrtho({
            left    : -10,
            right   : 10,
            top     : 10,
            bottom  : -10,
            near    : 0.1,
            far     : 100,
            position: [10, 20, 0],
            target  : [0, 0, 0],
        });

        this._depthTexture = this._device.createTexture({
            size  : [this._textureSize, this._textureSize, 1],
            usage : window.GPUTextureUsage.RENDER_ATTACHMENT | window.GPUTextureUsage.TEXTURE_BINDING,
            format: "depth32float",
        });

        this._depthTextureView = this._depthTexture.createView();

        const uniformBufferSize =  // view matrix + projection matrix + quaternion
			16 * Float32Array.BYTES_PER_ELEMENT +
			16 * Float32Array.BYTES_PER_ELEMENT +
			4 * Float32Array.BYTES_PER_ELEMENT;

		this._viewUniformBuffer = this._device.createBuffer({
			size : uniformBufferSize,
			usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST,
		});

        const nodeUniformBuffer = this._particleRenderer.nodeUniformBuffer;

        const bindGroupLayout = this._device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: window.GPUShaderStage.VERTEX,
                    buffer: { type: "uniform" },
                }, {
                    binding: 1,
                    visibility: window.GPUShaderStage.VERTEX,
                    buffer: { type: "uniform" },
                }
            ],
        });

        this._bindGroup = this._device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this._viewUniformBuffer },
                },
                {
                    binding: 1,
                    resource: { buffer: nodeUniformBuffer },
                },
            ],
        });

        const pipelineLayout = this._device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout],
        });

        const shadowDepthShaderModule = this._device.createShaderModule({
            label: "shadow depth shader module",
            code: shadowDepthShader
        });

        this._pipeline = this._device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: shadowDepthShaderModule,
                entryPoint: "vs",
                buffers: [
                    this._particleRenderer.vertexBufferLayout,
                    this._particleRenderer.particleInstanceLayout
                ]
            },
            depthStencil: {
                format: "depth32float",
                depthWriteEnabled: true,
                depthCompare: "less",
            },
        });
        
    }

    resize() {}

    update() {

        this._device.queue.writeBuffer(this._viewUniformBuffer, 0, new Float32Array(
            [
                ...this._light.projection,
                ...this._light.view,
                ...this._light.transform.quaternion,
            ]
        ));

        const renderEncoder = this._device.createCommandEncoder({
			label: "render encoder"
		});

        this._renderPassDescriptor = {
            colorAttachments: [],
            depthStencilAttachment: {
                view: this._depthTextureView,
                depthLoadValue: 1.0,
                depthLoadOp: "load",
                depthStoreOp: "store",
            }
        };

        const renderPass = renderEncoder.beginRenderPass(this._renderPassDescriptor);

        renderPass.setPipeline(this._pipeline);
		renderPass.setBindGroup(0, this._bindGroup);
		renderPass.setVertexBuffer(0, this._particleRenderer.triangleBuffer);
		renderPass.setVertexBuffer(1, this._compute.particleBuffers);
		renderPass.draw(3, this._particleRenderer.particleCount, 0, 0);

		renderPass.end();

		const renderCommandBuffer = renderEncoder.finish();
		this._device.queue.submit([renderCommandBuffer]);
    }
}