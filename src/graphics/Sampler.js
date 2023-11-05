export default class Sampler {
    
        constructor({ device, samplerDesc = {
            magFilter: "nearest",
            minFilter: "nearest",
            mipmapFilter: "nearest",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
            addressModeW: "clamp-to-edge",
        } }) {
            this._device = device;
            this._sampler = device.createSampler(samplerDesc);
        }
    
        get sampler() {
            return this._sampler;
        }
    
}