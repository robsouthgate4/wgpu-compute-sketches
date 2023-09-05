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
			depthStencil: {
				depthWriteEnabled: true,
				depthCompare: 'less',
				format: 'depth24plus',
			},
			multisample: {
				count: 4,
			},
			primitive: {
				topology: 'triangle-list',
			},
        });

        this.resizeTextures();

    }

    resizeTextures() {

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

    render( renderPass ) {

        renderPass.setPipeline(this._pipeline);
        renderPass.setBindGroup(0, this._bindGroup);
        renderPass.draw(3);

    }
}