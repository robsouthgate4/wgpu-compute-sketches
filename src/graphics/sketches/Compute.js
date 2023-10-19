import { DracoLoader, Sphere } from "bolt-wgpu";
import { computeShader } from "./shaders/computeShader";
import { sceneSettings } from "../../globals/constants";

const WORK_GROUP_SIZE = 64;

export default class Compute {
    constructor(bolt, {
        startData,
        particleCount = sceneSettings.PARTICLE_COUNT,
    }) {

        this._bolt                = bolt;
        this._particleCount       = particleCount;
        this._startData           = startData;
        this._device              = this._bolt.device;
        this._particleBuffer      = null;
        this._uniformBuffer       = null;
        this._uniformData         = null;
        this._computePipeline     = null;
        this._computeBindGroup    = null;
        this._readCPUBuffer       = null;
        this._startPositionBuffer = null;

    }

    async init() {

		const dracoLoader = new DracoLoader(this._bolt);
		const bunnygeo = await dracoLoader.load("static/models/draco/bunny.drc");

        this._uniformData = new Float32Array([ //TODO: convert to ArrayBuffer instead of Float32Array
            0.0, // time
            0.0, // deltaTime
            0.25, // curlTime
            Math.random(), // seed
            0
        ]);

        this._uniformBuffer = this._device.createBuffer({
            label: "Uniform buffer",
            size: this._uniformData.byteLength,
            usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST,
        });

        const resetPositionData = new Float32Array(this._particleCount * 4);
        const particleStartPositions = new Float32Array(this._particleCount * 4);

        for (let i = 0; i < this._particleCount; i++) {

            const stride = 4;

            resetPositionData[i * stride]     = this._startData[i * 3];      // posX
            resetPositionData[i * stride + 1] = this._startData[i * 3 + 1];  // posY
            resetPositionData[i * stride + 2] = this._startData[i * 3 + 2];  // posZ
            resetPositionData[i * stride + 3] = 0.01;  // lifetime

            particleStartPositions[i * stride]     = this._startData[i * 3 + 1]; // posX
            particleStartPositions[i * stride + 1] = this._startData[i * 3 + 2]; // posY
            particleStartPositions[i * stride + 2] = this._startData[i * 3 + 3] ; // posZ
            particleStartPositions[i * stride + 3] = (Math.random() * 2 - 1);  // lifetime

        }

        const objectScatter = bunnygeo;
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

        this._scatterVerticesBuffer = this._device.createBuffer({
            label: "Scatter vertices buffer",
            size: objectScatterVertices.byteLength,
            usage: window.GPUBufferUsage.VERTEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
        });

        this._device.queue.writeBuffer(this._scatterVerticesBuffer, 0, objectScatterVertices);

        this._startPositionBuffer = this._device.createBuffer({
            label: "Vertex buffer",
            size: resetPositionData.byteLength,
            usage: window.GPUBufferUsage.VERTEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
        });

        this._device.queue.writeBuffer(this._startPositionBuffer, 0, resetPositionData);

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
            size: particleStartPositions.byteLength,
            usage: window.GPUBufferUsage.VERTEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
        }),

        this._device.queue.writeBuffer(this._particleBuffer, 0, particleStartPositions);

        // create a buffer on the GPU to get a copy of the results
        this._readCPUBuffer = this._device.createBuffer({
            label: 'result buffer',
            size: particleStartPositions.byteLength,
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
            ],
        });

        //this.updateTest(1,1);
    }

    //update(){}

    async update(elapsed, delta) {
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

        // Read the results
        // await this._readCPUBuffer.mapAsync(window.GPUMapMode.READ);
        // const result = new Float32Array(this._readCPUBuffer.getMappedRange().slice());
        // console.log(result);
        // this._readCPUBuffer.unmap();

    }

    get particleBuffer() {
        return this._particleBuffer;
    }

}