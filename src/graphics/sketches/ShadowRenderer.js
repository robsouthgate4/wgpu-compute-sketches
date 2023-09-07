
import { shadowDepthShader } from "./shaders/particleDepthShader";

export default class ShadowRenderer {

    constructor(bolt, sharedData, vertexBufferLayout, interleavedBuffer, nodeUniformBuffer, indexBuffer, indicesCount) {

        this._bolt                 = bolt;
        this._light                = sharedData.light;
        this._lightUniformBuffer   = sharedData.lightUniformBuffer;
        this._shadowTexture        = sharedData.shadowTexture;
        this._nodeUniformBuffer    = nodeUniformBuffer;
        this._vertexBufferLayout   = vertexBufferLayout;
        this._interleavedBuffer    = interleavedBuffer;
        this._indicesCount         = indicesCount;
        this._indexBuffer          = indexBuffer;
        this._device               = this._bolt.device;
        this._renderPassDescriptor = null;
        this._depthTexture         = null;
        this.init();

        console.log(this._indicesCount)

    }

    init() {

        const shadowDepthShaderModule = this._device.createShaderModule({
            label: "shadow depth shader module",
            code: shadowDepthShader
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

    draw(commandEncoder) {

        const renderPass = commandEncoder.beginRenderPass(this._renderPassDescriptor);

        renderPass.setPipeline(this._pipeline);
        renderPass.setBindGroup(0, this._bindGroup);
        renderPass.setVertexBuffer(0, this._interleavedBuffer);
		renderPass.setIndexBuffer(this._indexBuffer, 'uint16');
        renderPass.drawIndexed(this._indicesCount);

        renderPass.end();
    }

}