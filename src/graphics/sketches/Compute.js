import { computeShader } from "./shaders/computeShader";

const WORK_GROUP_SIZE = 64;

export default class Compute {
    constructor(bolt, {
        startData,
        particleCount = 50000,
    }) {

        this._bolt = bolt;
        this._particleCount = particleCount;
        this._startData = startData;
        this._device = this._bolt.device;

        this.init();

    }

    init() {

        this._uniformData = new Float32Array([
            0.0, // time
            0.0, // deltaTime
            0.25 // curlTime
        ]);

        this._uniformBuffer = this._device.createBuffer({
            label: "Uniform buffer",
            size: this._uniformData.byteLength,
            usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST,
        });

        const startPositionData = new Float32Array(this._particleCount * 4);
        const particleStartPositions = new Float32Array(this._particleCount * 4);

        for (let i = 0; i < this._particleCount; i++) {

            const stride = 4;

            startPositionData[i * stride] = this._startData[i * 3] * 1; // posX
            startPositionData[i * stride + 1] = this._startData[i * 3 + 1] * 1; // posY
            startPositionData[i * stride + 2] = this._startData[i * 3 + 2] * 1; // posZ
            startPositionData[i * stride + 3] = 0.01; // lifetime

            particleStartPositions[i * stride] = 0; // posX
            particleStartPositions[i * stride + 1] = 0; // posY
            particleStartPositions[i * stride + 2] = 0; // posZ
            particleStartPositions[i * stride + 3] = (Math.random() * 2 - 1); // lifetime

        }

        this._startPositionBuffer = this._device.createBuffer({
            label: "Vertex buffer",
            size: startPositionData.byteLength,
            usage: window.GPUBufferUsage.VERTEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
        });

        this._device.queue.writeBuffer(this._startPositionBuffer, 0, startPositionData);

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

        this._particleBuffers = [
            this._device.createBuffer({
                label: 'particle buffer A',
                size: particleStartPositions.byteLength,
                usage: window.GPUBufferUsage.VERTEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
            }),
        ];

        this._device.queue.writeBuffer(this._particleBuffers[0], 0, particleStartPositions);

        // create a buffer on the GPU to get a copy of the results
        this._readCPUBuffer = this._device.createBuffer({
            label: 'result buffer',
            size: particleStartPositions.byteLength,
            usage: window.GPUBufferUsage.MAP_READ | window.GPUBufferUsage.COPY_DST,
            mapAtCreation: false,
        });

        // Setup a bindGroup to tell the shader which
        // buffer to use for the computation
        this._computeBindGroups = [
            this._device.createBindGroup({
                label: 'bindGroup A',
                layout: bindGroupLayout,
                entries: [
                    { binding: 0, resource: { buffer: this._startPositionBuffer } },
                    { binding: 1, resource: { buffer: this._particleBuffers[0] } },
                    { binding: 2, resource: { buffer: this._uniformBuffer } }
                ],
            }),
        ];
    }

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
        computePass.setBindGroup(0, this._computeBindGroups[0]);
        computePass.dispatchWorkgroups(Math.ceil((this._particleCount) / WORK_GROUP_SIZE));
        computePass.end();

        //computeEncoder.copyBufferToBuffer(this._particleBuffers[0], 0, this._readCPUBuffer, 0, this._readCPUBuffer.size);

        const computeCommandBuffer = computeEncoder.finish();
        this._device.queue.submit([computeCommandBuffer]);

        // Read the results
        // await this._readCPUBuffer.mapAsync(window.GPUMapMode.READ);
        // const result = new Float32Array(this._readCPUBuffer.getMappedRange().slice());
        // console.log(result);
        // this._readCPUBuffer.unmap();

    }

    get particleBuffers() {
        return this._particleBuffers;
    }

}