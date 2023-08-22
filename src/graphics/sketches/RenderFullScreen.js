import { fullScreen } from "./shaders/fullScreenShader";

export default class RenderFullScreen {
    constructor(bolt, texture) {

        this._bolt = bolt;

        this._device = bolt.device;

        this._uniformData = new Float32Array([0,0]);
        this._uniformData[0] = this._bolt.canvas.width;
        this._uniformData[1] = this._bolt.canvas.height;
        
        const uniformBufferSize = 2 * 4;
        this._uniformBuffer = this._device.createBuffer({
            size: uniformBufferSize,
            usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST
        });

        this._device.queue.writeBuffer(
            this._uniformBuffer,
            0,
            this._uniformData.buffer
        );

        this._bindGroupLayout = this._device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: window.GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "depth"
                    }
                },
                {
                    binding: 1,
                    visibility: window.GPUShaderStage.FRAGMENT,
                    sampler: {
                        type: "filtering"
                    }
                },
                {
                    binding: 2,
                    visibility: window.GPUShaderStage.VERTEX | window.GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "uniform"
                    }
                }
            ]
        });

        const sampler = this._device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        }); 

        this._bindGroup = this._device.createBindGroup({
            layout: this._bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: texture.createView()
                },
                {
                    binding: 1,
                    resource: sampler
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this._uniformBuffer,
                    }
                }
            ]
        });

        const shaderModule = this._device.createShaderModule({
            code: fullScreen,
            label: "full screen shader module"
        });

        const pipelineLayout = this._device.createPipelineLayout({
            bindGroupLayouts: [this._bindGroupLayout]
        });

        this._pipeline = this._device.createRenderPipeline({
            label: "full screen render pipeline",
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: "vs",
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fs",
                targets: [{
					format: this._bolt.presentationFormat
				}]
            },
            primitive: {
                topology: "triangle-list"
            },
            multisample: {
                count: 4
            }
        });

        this.resizeTextures();

    }

    resizeTextures() {

        if (this._renderTexture) {
			this._renderTexture.destroy();
		}

		this._renderTexture = this._device.createTexture({
			size: [this._bolt.canvas.width, this._bolt.canvas.height],
			format: this._bolt.presentationFormat,
			sampleCount: 4,
			usage: window.GPUTextureUsage.RENDER_ATTACHMENT,
		});

		this._renderTextureView = this._renderTexture.createView();

        this._uniformData[0] = this._bolt.canvas.width;
        this._uniformData[1] = this._bolt.canvas.height;

        this._device.queue.writeBuffer(
            this._uniformBuffer,
            0,
            this._uniformData.buffer
        );

    }

    resize() {
        
    }

    render( commandEncoder ) {

        this._renderPassDescriptor = {
            colorAttachments: [
                {
                    view: this._renderTextureView,
                    resolveTarget: this._bolt.context.getCurrentTexture().createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: "clear",
                    storeOp: "store",
                }
            ],
        };

        const renderPass = commandEncoder.beginRenderPass(this._renderPassDescriptor);

        renderPass.setPipeline(this._pipeline);
        renderPass.setBindGroup(0, this._bindGroup);
        renderPass.draw(3);
        
        renderPass.end();

    }
}