
import { depthShader } from "./shaders/depthShader";

export default class ShadowRenderer {

    constructor(bolt, sharedData, objectRenderers) {

        this._bolt                 = bolt;
        this._light                = sharedData.light;
        this._lightUniformBuffer   = sharedData.lightUniformBuffer;
        this._shadowTexture        = sharedData.shadowTexture;
        this._device               = this._bolt.device;
        this._renderPassDescriptor = null;
        this._depthTexture         = null;
        this._objectRenderers      = objectRenderers
        this.init();

    }

    init() {


        const arrayStride = 8; // 3 for position, 3 for normal, 2 for uv
        this._vertexBufferLayout = {
			arrayStride: arrayStride * Float32Array.BYTES_PER_ELEMENT,
			attributes: [{
				shaderLocation: 0,
				offset: 0,
				format: "float32x3"
			},
			{
				shaderLocation: 1,
				offset: 3 * Float32Array.BYTES_PER_ELEMENT,
				format: "float32x3"
			}, {
				shaderLocation: 2,
				offset: 6 * Float32Array.BYTES_PER_ELEMENT,
				format: "float32x2"
			}]
		};

        const shadowDepthShaderModule = this._device.createShaderModule({
            label: "shadow depth shader module",
            code: depthShader
        });

        this._pipeline = this._device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: shadowDepthShaderModule,
                entryPoint: "vs",
                buffers: [
                    this._vertexBufferLayout
                ]
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth32float",
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "front",
            }
        });
    

        this._bindGroups = [];
        this._objectRenderers.forEach(objectRenderer => {
            this._bindGroups.push(this._device.createBindGroup({
                layout: this._pipeline.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: this._lightUniformBuffer },
                    },
                    {
                        binding: 1,
                        resource: { buffer: objectRenderer.nodeUniformBuffer },
                    },
                ],
            }));
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

    draw(commandEncoder) {

        const renderPass = commandEncoder.beginRenderPass(this._renderPassDescriptor);

        renderPass.setPipeline(this._pipeline);

        this._objectRenderers.forEach((objectRenderer, index) => {

            renderPass.setBindGroup(0, this._bindGroups[index]);
            renderPass.setVertexBuffer(0, objectRenderer.interleavedBuffer);
            renderPass.setIndexBuffer(objectRenderer.indexBuffer, 'uint16');
            renderPass.drawIndexed(objectRenderer.indexCount);
            
        });

        renderPass.end();
    }

}