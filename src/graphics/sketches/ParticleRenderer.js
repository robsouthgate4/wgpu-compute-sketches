import { particleShader } from "./shaders/particleShader";

export default class ParticleRenderer {

	constructor(bolt, sharedData) {

		this._bolt = bolt;
		this._device = bolt.device;
		this._compute = sharedData.compute;
		this._light = sharedData.light;
		this._lightUniformBuffer = sharedData.lightUniformBuffer;
		this._verticesBuffer = sharedData.triangleBuffer;
		this._sceneUniformBuffer = sharedData.sceneUniformBuffer;
		this._nodeUniformBuffer = sharedData.nodeUniformBuffer;
		this._particleCount = sharedData.particleCount;
		this._shadowTexture = sharedData.shadowTexture;
		this._indicesBuffer = null;
		this._pipeline = null;
		this._bindGroup = null;
		this._renderPassDescriptor = null;
		this._particleInstanceLayout = null;
		this._renderTexture = null;
		this._renderTextureView = null;
		this._depthTexture = null;
		this._depthTextureView = null;
		this._vertexBufferLayout = null;
		this._indexCount = 0;
		this.init();

	}

	async init() {

		// MESH GEOMETRY SETUP
		const vertices = new Float32Array([
			-0.5, -0.5, 0.0,
			0.5, -0.5, 0.0,
			0.0, 0.5, 0.0
		]);

		this._verticesBuffer = this._device.createBuffer({
			label: "Triangle vertices buffer",
			size: vertices.byteLength,
			usage: window.GPUBufferUsage.VERTEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
		})

		this._device.queue.writeBuffer(this._verticesBuffer, 0, vertices);

		this._vertexBufferLayout = {
			arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
			stepMode: 'vertex',
			attributes: [{
				shaderLocation: 0,
				offset: 0,
				format: "float32x3"
			}]
		}

		const particleInstanceByteSize =
			3 * Float32Array.BYTES_PER_ELEMENT + // position
			1 * Float32Array.BYTES_PER_ELEMENT + // padding
			3 * Float32Array.BYTES_PER_ELEMENT + // velocity
			1 * Float32Array.BYTES_PER_ELEMENT; // lifetime


		this._particleInstanceLayout = {
			// instanced particles buffer
			arrayStride: particleInstanceByteSize,
			stepMode: 'instance',
			attributes: [
				{
					// instance offset
					shaderLocation: 1,
					offset: 0,
					format: 'float32x3',
				},
				{
					// instance velocity
					shaderLocation: 2,
					offset: 3 * Float32Array.BYTES_PER_ELEMENT,
					format: 'float32x3'
				},
				{
					// instance lifetime
					shaderLocation: 3,
					offset: 6 * Float32Array.BYTES_PER_ELEMENT,
					format: 'float32'
				}
			],
		}

		const particleShaderModule = this._device.createShaderModule({
			label: "particle shader module",
			code: particleShader
		});

		const bindGroupLayout = this._device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: window.GPUShaderStage.VERTEX,
					buffer: { type: "uniform" },
				}, {
					binding: 1,
					visibility: window.GPUShaderStage.VERTEX,
					buffer: { type: "uniform" },
				}, {
					binding: 2,
					visibility: window.GPUShaderStage.VERTEX,
					buffer: { type: "uniform" },
				}, {
					binding: 3,
					visibility: window.GPUShaderStage.FRAGMENT,
					texture: { sampleType: "depth" },
				}, {
					binding: 4,
					visibility: window.GPUShaderStage.FRAGMENT,
					sampler: { type: "comparison" },
				}
			],
		});

		const shadowSampler = this._device.createSampler({
			compare: "less",
		});

		this._bindGroup = this._device.createBindGroup({
			layout: bindGroupLayout,
			entries: [
				{
					binding: 0,
					resource: { buffer: this._sceneUniformBuffer },
				},
				{
					binding: 1,
					resource: { buffer: this._nodeUniformBuffer },
				},
				{
					binding: 2,
					resource: { buffer: this._lightUniformBuffer },
				},
				{
					binding: 3,
					resource: this._shadowTexture.createView(),
				},
				{
					binding: 4,
					resource: shadowSampler,
				}
			],
		});

		const pipelineLayout = this._device.createPipelineLayout({
			bindGroupLayouts: [bindGroupLayout],
		});

		this._pipeline = this._device.createRenderPipeline({
			label: "particle render pipeline",
			layout: pipelineLayout,
			vertex: {
				module: particleShaderModule,
				entryPoint: "vs",
				buffers: [
					this._vertexBufferLayout,
					this._particleInstanceLayout
				]
			},
			fragment: {
				module: particleShaderModule,
				entryPoint: "fs",
				targets: [{
					format: this._bolt.presentationFormat
				}]
			},
			depthStencil: {
				depthWriteEnabled: true,
				depthCompare: 'less',
				format: 'depth24plus-stencil8'
			},
			multisample: {
				count: 4,
			},
			primitive: {
				topology: 'triangle-list',
				cullMode: 'none',
			},
		})

		this.resizeTextures();

	}

	resize() {

	}

	resizeTextures() {


	}

	update(renderPass) {

		renderPass.setPipeline(this._pipeline);
		renderPass.setBindGroup(0, this._bindGroup);
		renderPass.setVertexBuffer(0, this._verticesBuffer);
		renderPass.setVertexBuffer(1, this._compute.particleBuffer);
		renderPass.draw(3, this._particleCount);


	}

	get triangleBuffer() {
		return this._verticesBuffer;
	}

	get vertexBufferLayout() {
		return this._vertexBufferLayout;
	}

	get particleInstanceLayout() {
		return this._particleInstanceLayout;
	}

	get viewUniformBuffer() {
		return this._sceneUniformBuffer
	}

	get nodeUniformBuffer() {
		return this._nodeUniformBuffer
	}

	get particleCount() {
		return this._particleCount;
	}
}