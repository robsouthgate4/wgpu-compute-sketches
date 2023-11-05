export default class Texture2D {

    constructor({ device, path, texture }) {
        this._path = path;
        this._device = device;
        this._texture = texture;
        this._textureView = null;
    }

    async loadImageBitmap() {
        const result = await fetch(this._path);
        const blob = await result.blob();
        const source = await createImageBitmap(blob, { colorSpaceConversion: 'none' })

        const texture = this._device.createTexture({
            label: this._path,
            format: 'rgba8unorm',
            size: [source.width, source.height],
            usage: window.GPUTextureUsage.TEXTURE_BINDING |
                   window.GPUTextureUsage.COPY_DST |
                   window.GPUTextureUsage.RENDER_ATTACHMENT,
          });

        this._device.queue.copyExternalImageToTexture(
            { source, flipY: true },
            { texture },
            { width: source.width, height: source.height },
        );

        return texture;
    }

    get texture() {
        return this._texture;
    }

    get textureView() {
        if (this._textureView == null) {
            this._textureView = this._texture.createView();
        }
        return this._textureView;
    }

}