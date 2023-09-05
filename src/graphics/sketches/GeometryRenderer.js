import { Node } from "bolt-wgpu";

export default class GeometryRenderer {

	constructor(bolt, sharedData, geometry, shader) {

		this._bolt                 = bolt;
		this._shader               = shader;
		this._device               = bolt.device;
		this._geometry             = geometry;
		this._light                = sharedData.light;
		this._lightUniformBuffer   = sharedData.lightUniformBuffer;
		this._sceneUniformBuffer   = sharedData.sceneUniformBuffer;
		this._shadowTexture 	   = sharedData.shadowTexture;		
		this._pipeline             = null;
		this._bindGroup            = null;
		this._renderPassDescriptor = null;
		this._renderTexture        = null;
		this._renderTextureView    = null;
		this._depthTexture         = null;
		this._depthTextureView     = null;
		this._vertexBufferLayout   = null;
		this._indexBuffer          = null;

		
		this.init();

	}

	async init() {

		const positions = this._geometry.positions;
		const normals = this._geometry.normals;
		const uvs = this._geometry.uvs;
		const indices = new Uint16Array(this._geometry.indices);

		this._node = new Node();

		this._nodeUniformBuffer = this._device.createBuffer({
			label: "Node uniform buffer",
			size: 16 * Float32Array.BYTES_PER_ELEMENT,
			usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST,
		});

		this._device.queue.writeBuffer(this._nodeUniformBuffer, 0, this._node.modelMatrix);

		this._indexBuffer = this._device.createBuffer({
			label: "Indices buffer",
			size: indices.byteLength,
			usage: window.GPUBufferUsage.INDEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
		});

		this._device.queue.writeBuffer(this._indexBuffer, 0, indices);

		const totalLength = positions.length + normals.length + uvs.length;
		const interleavedArray = new Float32Array(totalLength);
		const arrayStride = 8;

		for (let i = 0; i < positions.length; i++) {
			interleavedArray[i * arrayStride] = positions[i * 3];
			interleavedArray[i * arrayStride + 1] = positions[i * 3 + 1];
			interleavedArray[i * arrayStride + 2] = positions[i * 3 + 2];
			interleavedArray[i * arrayStride + 3] = normals[i * 3];
			interleavedArray[i * arrayStride + 4] = normals[i * 3 + 1];
			interleavedArray[i * arrayStride + 5] = normals[i * 3 + 2];
			interleavedArray[i * arrayStride + 6] = uvs[i * 2];
			interleavedArray[i * arrayStride + 7] = uvs[i * 2 + 1];
		}

		this._interleavedBuffer = this._device.createBuffer({
			label: "Interleaved vertices buffer",
			size: interleavedArray.byteLength,
			usage: window.GPUBufferUsage.VERTEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
		})

		this._device.queue.writeBuffer(this._interleavedBuffer, 0, interleavedArray);

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
			}
			]
		}

		const shaderModule = this._device.createShaderModule({
			label: "particle shader module",
			code: this._shader
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
				}, 
				{
					binding: 2,
					visibility: window.GPUShaderStage.VERTEX,
					buffer: { type: "uniform" },
				}, 
				{
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
			compare: "less"
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
				module: shaderModule,
				entryPoint: "vs",
				buffers: [
					this._vertexBufferLayout
				]
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
		})

		this.resizeTextures();

	}

	resize() {

	}

	resizeTextures() {

		
	}

	draw(renderPass) {

		this._node.updateModelMatrix();
		this._device.queue.writeBuffer(this._nodeUniformBuffer, 0, this._node.modelMatrix);

		renderPass.setPipeline(this._pipeline);
		renderPass.setBindGroup(0, this._bindGroup);
		renderPass.setVertexBuffer(0, this._interleavedBuffer);
		renderPass.setIndexBuffer(this._indexBuffer, 'uint16');
		renderPass.drawIndexed(this._geometry.indices.length);

	}

	get node() {
		return this._node;
	}

	get vertexBufferLayout() {
		return this._vertexBufferLayout;
	}

	get interleavedBuffer() {
		return this._interleavedBuffer;
	}

	get indexBuffer(){
		return this._indexBuffer;
	}

	get indexCount() {
		return this._geometry.indices.length;
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