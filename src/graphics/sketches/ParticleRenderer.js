
import { Node } from "bolt-wgpu";
import { vec3 } from "gl-matrix";
import { particleShader } from "./shaders/particleShader";

export default class ParticleRenderer {

	constructor(bolt, geometry, compute) {

		this._bolt                   = bolt;
		this._device                 = bolt.device;
		this._compute                = compute;
		this._triangleBuffer         = null;
		this._node                   = null;
		this._viewUniformBuffer      = null;
		this._pipeline               = null;
		this._bindGroup              = null;
		this._geometry               = geometry;
		this._particleCount          = 0;
		this._renderPassDescriptor   = null;
		this._particleInstanceLayout = null;
		this._renderTexture          = null;
		this._renderTextureView      = null;
		this._depthTexture           = null;
		this._depthTextureView       = null;
		this._vertexBufferLayout     = null;
		this.init();

	}

	async init() {

		this._node                     = new Node();
		this._node.transform.positionY = 0;
		this._node.transform.scale     = vec3.fromValues(1.4, 1.4, 1.4);

		// MESH GEOMETRY SETUP
		const triangleArray = new Float32Array([
			-0.5, -0.5, 0.0,
			0.5, -0.5, 0.0,
			0.0, 0.5, 0.0
		]);

		this._triangleBuffer = this._device.createBuffer({
			label: "Triangle vertices buffer",
			size: triangleArray.byteLength,
			usage: window.GPUBufferUsage.VERTEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
		})

		this._device.queue.writeBuffer(this._triangleBuffer, 0, triangleArray);

		const { positions } = this._geometry;
		const startData = new Float32Array(positions);

		this._particleCount = startData.length / 3;

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
			4 * Float32Array.BYTES_PER_ELEMENT;

		this._particleInstanceLayout = {
			// instanced particles buffer
			arrayStride: particleInstanceByteSize,
			stepMode: 'instance',
			attributes: [
				{
					// instance offset
					shaderLocation: 1,
					offset: 0,
					format: 'float32x4',
				},
				{
					// instance lifetime
					shaderLocation: 2,
					offset: 3 * Float32Array.BYTES_PER_ELEMENT,
					format: 'float32',
				}
			],
		}

		const particleShaderModule = this._device.createShaderModule({
			label: "particle shader module",
			code: particleShader
		});

		const uniformBufferSize =  // view matrix + projection matrix + quaternion
			16 * Float32Array.BYTES_PER_ELEMENT +
			16 * Float32Array.BYTES_PER_ELEMENT +
			4 * Float32Array.BYTES_PER_ELEMENT;

		this._viewUniformBuffer = this._device.createBuffer({
			size: uniformBufferSize,
			usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST,
		});

		this._nodeUniformBuffer = this._device.createBuffer({
			size: 16 * Float32Array.BYTES_PER_ELEMENT,
			usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST,
		});

		this._device.queue.writeBuffer(this._nodeUniformBuffer, 0, this._node.modelMatrix);

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
				}
			],
		});

		this._bindGroup = this._device.createBindGroup({
			layout: bindGroupLayout,
			entries: [
				{
					binding: 0,
					resource: { buffer: this._viewUniformBuffer },
				},
				{
					binding: 1,
					resource: { buffer: this._nodeUniformBuffer },
				},
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
				format: 'depth24plus',
			},
			multisample: {
				count: 4,
			},
			primitive: {
				topology: 'triangle-list',
				//cullMode: 'back',
			},
		})

		this.resizeTextures();

	}

	resize() {

	}

	resizeTextures() {

		if (this._renderTexture) {
			this._renderTexture.destroy();
		}

		this._renderTexture = this._device.createTexture({
			size: [this._bolt.canvas.width, this._bolt.canvas.height],
			format: this._bolt.presentationFormat,
			sampleCount: 4,
			usage: window.GPUTextureUsage.RENDER_ATTACHMENT,
		});

		this._renderTextureView = this._renderTexture.createView();

		this._depthTexture = this._device.createTexture({
			size: [this._bolt.canvas.width, this._bolt.canvas.height],
			format: 'depth24plus',
			sampleCount: 4,
			usage: window.GPUTextureUsage.RENDER_ATTACHMENT,
		});

		this._depthTextureView = this._depthTexture.createView();
	}

	update(camera) {

		this._device.queue.writeBuffer(this._viewUniformBuffer, 0, new Float32Array([
			...camera.projection,
			...camera.view,
			...camera.transform.quaternion
		]));

		this._node.updateModelMatrix();
		this._device.queue.writeBuffer(this._nodeUniformBuffer, 0, this._node.modelMatrix);

		const renderEncoder = this._device.createCommandEncoder({
			label: "render encoder"
		});

		this._renderPassDescriptor = {
			colorAttachments: [{
				view: this._renderTextureView,
				resolveTarget: this._bolt.context.getCurrentTexture().createView(),
				clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
				loadOp: 'clear',
				storeOp: 'store',
			}],
			depthStencilAttachment: {
				view: this._depthTextureView,
				depthClearValue: 1,
				depthLoadOp: 'clear',
				depthStoreOp: 'store',
			}
		}

		const renderPass = renderEncoder.beginRenderPass(this._renderPassDescriptor);

		renderPass.setPipeline(this._pipeline);
		renderPass.setBindGroup(0, this._bindGroup);
		renderPass.setVertexBuffer(0, this._triangleBuffer);
		renderPass.setVertexBuffer(1, this._compute.particleBuffers);
		renderPass.draw(3, this._particleCount, 0, 0);

		renderPass.end();

		const renderCommandBuffer = renderEncoder.finish();
		this._device.queue.submit([renderCommandBuffer]);

	}

	get triangleBuffer() {
		return this._triangleBuffer;
	}

	get vertexBufferLayout() {
		return this._vertexBufferLayout;
	}

	get particleInstanceLayout() {
		return this._particleInstanceLayout;
	}

	get viewUniformBuffer() {
		return this._viewUniformBuffer
	}

	get nodeUniformBuffer() {
		return this._nodeUniformBuffer
	}

	get particleCount() {
		return this._particleCount;
	}
}