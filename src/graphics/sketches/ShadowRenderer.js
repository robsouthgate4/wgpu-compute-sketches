export default class ShadowRenderer {
    constructor(bolt, particleRenderer) {
        this._bolt = bolt
        this._device = this._bolt.device;
        this._particleCount = 0;
        this._renderPassDescriptor = null;
        this._depthTexture = null;
        this._textureSize = 1024;
        this._particleRenderer = particleRenderer;
        this.init();
    }

    init() {

        this._depthTexture = this._device.createTexture({
            size: [this._textureSize, this._textureSize, 1],
            usage: window.GPUTextureUsage.RENDER_ATTACHMENT | window.GPUTextureUsage.TEXTURE_BINDING,
            format: "depth32float",
        });

        this._depthTextureView = this._depthTexture.createView();

        const viewUniformBuffer = this._particleRenderer.viewUniformBuffer;

        console.log(viewUniformBuffer);

        // this._pipeline = this._device.createRenderPipeline({
        //     layout: this._device.createPipelineLayout({
        //         bindGroupLayouts: [
                    
        //         ]
        //     })
        // })
    }

    resize() {
        
    }
}