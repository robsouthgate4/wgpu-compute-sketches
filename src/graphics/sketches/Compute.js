import { Node, SkinLoader} from "bolt-wgpu";
import { computeShader } from "./shaders/computeShader";
import { sceneSettings } from "../../globals/constants";
import Skin from "../skin-loader/Skin";
import BakedAnimation from "../BakedAnimation";
import { vec3 } from "gl-matrix";

const WORK_GROUP_SIZE = 64;

export default class Compute {
    constructor(bolt, {
        startData,
        particleCount = sceneSettings.PARTICLE_COUNT,
    }) {

        this._bolt = bolt;
        this._particleCount = particleCount;
        this._startData = startData;
        this._device = this._bolt.device;
        this._particleBuffer = null;
        this._uniformBuffer = null;
        this._uniformData = null;
        this._computePipeline = null;
        this._computeBindGroup = null;
        this._readCPUBuffer = null;
        this._startPositionBuffer = null;
        this._skinNode = new Node();
        this._animation = null;

    }

    async init() {

        //this._skinNode.transform.scale = vec3.fromValues(0.1, 0.1, 0.1);

		const loader = new SkinLoader(this._bolt);
		await loader.load("static/models/gltf/character/running-woman2.glb");
		const geometries = loader.geometries;
        const skins = loader.skins;
        const animations = loader.animations;

        this._animation = new BakedAnimation(animations);
        this._animation.runAnimation("Armature|mixamo.com|Layer0");
        const joints = Object.values(this._animation._currentAnimation).map((obj) => obj.node );

        this._skin = new Skin(joints, skins[0].bindTransforms);

        const geometryData = geometries[1][0];
        const geometryToScatter = geometryData.geometry;
        const jointIndices = geometryData.joints;
        const jointWeights = geometryData.weights;

        this._jointDataBuffer = this._device.createBuffer({
            label: "Joint data buffer",
            size: this._skin.jointData.byteLength,
            usage: window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
        });

        this._device.queue.writeBuffer(this._jointDataBuffer, 0, this._skin.jointData);

        this._jointIndicesBuffer = this._device.createBuffer({
            label: "Joint indices buffer",
            size: jointIndices.data.byteLength,
            usage: window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
        });

        this._device.queue.writeBuffer(this._jointIndicesBuffer, 0, jointIndices.data);

        this._jointWeightsBuffer = this._device.createBuffer({
            label: "Joint weights buffer",
            size: jointWeights.data.byteLength,
            usage: window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
        });

        this._device.queue.writeBuffer(this._jointWeightsBuffer, 0, jointWeights.data);

        //TODO: convert to ArrayBuffer instead of Float32Array so we can have ints and floats in the same buffer
        this._uniformData = new Float32Array([ 
            0.0, // time
            0.0, // deltaTime
            0.15, // curlTime
            Math.random() * 10, // seed
            0
        ]);

        this._uniformBuffer = this._device.createBuffer({
            label: "Uniform buffer",
            size: this._uniformData.byteLength,
            usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST,
        });

        const particleByteSize =
            3 * 4 + // 3 floats for position
            1 * 4 + // 1 float for padding
            3 * 4 + // 3 floats for velocity
            1 * 4; // 1 float for lifetime

        const resetParticleData = new Float32Array(this._particleCount * 4);
        const particleData = new Float32Array(this._particleCount * 8);

        const resetParticleDataStride = 4; // Separate stride for resetParticleData since its layout differs.
        const particleDataStride = 8; // Correct stride for particleData.
        
        const objectScatter = geometryToScatter;

        for (let i = 0; i < this._particleCount; i++) {
            // Setup for resetParticleData which has only four elements per particle
            // resetParticleData[i * resetParticleDataStride] = this._startData[i * 3];     // posX
            // resetParticleData[i * resetParticleDataStride + 1] = this._startData[i * 3 + 1]; // posY
            // resetParticleData[i * resetParticleDataStride + 2] = this._startData[i * 3 + 2]; // posZ
            resetParticleData[i * resetParticleDataStride + 3] = Math.random() * 2 - 1;                   // lifetime

        
            particleData[i * particleDataStride] = objectScatter.positions[i * 3];     // posX
            particleData[i * particleDataStride + 1] = objectScatter.positions[i * 3 + 1]; // posY
            particleData[i * particleDataStride + 2] = objectScatter.positions[i * 3 + 2]; // posZ
            
            //particleData[i * particleDataStride + 3] = 4;                         // padding

            // particleData[i * particleDataStride + 4] = 0;                         // velocityX
            // particleData[i * particleDataStride + 5] = 0;                         // velocityY
            // particleData[i * particleDataStride + 6] = 0;                         // velocityZ

            particleData[i * particleDataStride + 7] = Math.random() * 2 - 1;      // lifetime
        }

        const objectScatterIndices = new Uint32Array(objectScatter.indices);
        const objectScatterVertices = new Float32Array(objectScatter.positions);

        this._uniformData[4] = objectScatter.indices.length / 3;

        this._device.queue.writeBuffer(this._uniformBuffer, 0, this._uniformData);

        this._scatterIndicesBuffer = this._device.createBuffer({
            label: "Scatter indices buffer",
            size: objectScatterIndices.byteLength,
            usage: window.GPUBufferUsage.INDEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
        });

        this._device.queue.writeBuffer(this._scatterIndicesBuffer, 0, objectScatterIndices);
        
        const svb = this._particleCount * 3 * 4 + 1 * 4;
        this._scatterVerticesBuffer = this._device.createBuffer({
            label: "Scatter vertices buffer",
            size: svb,
            usage: window.GPUBufferUsage.VERTEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
        });

        this._device.queue.writeBuffer(this._scatterVerticesBuffer, 0, objectScatterVertices);

        this._startPositionBuffer = this._device.createBuffer({
            label: "Vertex buffer",
            size: resetParticleData.byteLength,
            usage: window.GPUBufferUsage.VERTEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
        });

        this._device.queue.writeBuffer(this._startPositionBuffer, 0, resetParticleData);

        const computeShaderModule = this._device.createShaderModule({
            label: 'Compute module',
            code: computeShader(WORK_GROUP_SIZE),
        });

        const bindGroupLayout = this._device.createBindGroupLayout({
            label: "Compute bind group layout",
            entries: [
                {
                    binding: 0,
                    visibility: window.GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" },
                },
                {
                    binding: 1,
                    visibility: window.GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" },
                },
                {
                    binding: 2,
                    visibility: window.GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" },
                },
                {
                    binding: 3,
                    visibility: window.GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" },
                },
                {
                    binding: 4,
                    visibility: window.GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" },
                },
                {
                    binding: 5,
                    visibility: window.GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" },
                },
                {
                    binding: 6,
                    visibility: window.GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" },
                },
                {
                    binding: 7,
                    visibility: window.GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" },
                }
            ],
        });

        const pipelineLayout = this._device.createPipelineLayout({
            label: "Cell Pipeline Layout",
            bindGroupLayouts: [bindGroupLayout],
        });

        this._computePipeline = this._device.createComputePipeline({
            label: 'Compute pipeline',
            layout: pipelineLayout,
            compute: {
                module: computeShaderModule,
                entryPoint: 'computeMain',
            },
        });


        this._particleBuffer = this._device.createBuffer({
            label: 'particle buffer A',
            size: this._particleCount * particleByteSize,
            usage: window.GPUBufferUsage.VERTEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
        }),

            this._device.queue.writeBuffer(this._particleBuffer, 0, particleData);

        // create a buffer on the GPU to get a copy of the results
        this._readCPUBuffer = this._device.createBuffer({
            label: 'result buffer',
            size: this._particleCount * particleByteSize,
            usage: window.GPUBufferUsage.MAP_READ | window.GPUBufferUsage.COPY_DST,
            mapAtCreation: false,
        });

        this._computeBindGroup = this._device.createBindGroup({
            label: 'bindGroup A',
            layout: bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this._startPositionBuffer } },
                { binding: 1, resource: { buffer: this._particleBuffer } },
                { binding: 2, resource: { buffer: this._uniformBuffer } },
                { binding: 3, resource: { buffer: this._scatterVerticesBuffer } },
                { binding: 4, resource: { buffer: this._scatterIndicesBuffer } },
                { binding: 5, resource: { buffer: this._jointDataBuffer } },
                { binding: 6, resource: { buffer: this._jointWeightsBuffer  } },
                { binding: 7, resource: { buffer: this._jointIndicesBuffer } },
            ],
        });

        //this.updateTest(1, 1);
    }

    //update() { }

    async update(elapsed, delta) {

        this._animation.playFrame(0.3);
        this._animation.update(elapsed, delta);
        this._skin.update(this._skinNode);
        this._skinNode.updateModelMatrix();

        console.log(this._skin.jointData);

        this._device.queue.writeBuffer(this._jointDataBuffer, 0, this._skin.jointData);

        // Encode commands to do the computation
        const computeEncoder = this._device.createCommandEncoder({
            label: 'compute encoder',
        });

        const computePass = computeEncoder.beginComputePass({
            label: 'compute pass',
        });

        // update uniform data
        this._uniformData[0] = elapsed;
        this._uniformData[1] = delta;
        this._device.queue.writeBuffer(this._uniformBuffer, 0, this._uniformData);

        computePass.setPipeline(this._computePipeline);
        computePass.setBindGroup(0, this._computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil((this._particleCount) / WORK_GROUP_SIZE));
        computePass.end();

        //computeEncoder.copyBufferToBuffer(this._particleBuffer, 0, this._readCPUBuffer, 0, this._readCPUBuffer.size);

        const computeCommandBuffer = computeEncoder.finish();
        this._device.queue.submit([computeCommandBuffer]);

        //Read the results
        // await this._readCPUBuffer.mapAsync(window.GPUMapMode.READ);
        // const result = new Float32Array(this._readCPUBuffer.getMappedRange().slice());
        // console.log(result);
        // this._readCPUBuffer.unmap();

    }

    get particleBuffer() {
        return this._particleBuffer;
    }

}