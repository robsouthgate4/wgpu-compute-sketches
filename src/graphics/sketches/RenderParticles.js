
import { Node } from "bolt-wgpu";
import { vec3 } from "gl-matrix";
import { particleShader } from "./shaders/particleShader";

export default class RenderParticles {

    constructor(bolt, geometry, compute) {

		this._device = bolt.device;
        this._compute = compute;
		this._triangleBuffer = null;
		this._node = null;
		this._viewUniformBuffer = null;
		this._nodePipeline = null;
		this._nodeBindGroup = null;
        this._bolt = bolt;
        this._geometry = geometry;
        this._particleCount = 0;
        this.init();

    }

    async init() {

        this._node = new Node();
		this._node.transform.positionY = 0;
		this._node.transform.scale = vec3.fromValues(1.4, 1.4, 1.4);

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

		// RENDER PIPELINE SETUP
		const vertexBufferLayout = {
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

		const particleInstanceLayout = {
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

        // RENDER PIPELINE
		this._viewUniformBuffer = this._device.createBuffer({
			size: 16 * 2 * Float32Array.BYTES_PER_ELEMENT,
			usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST,
		});

		this._nodeUniformBuffer = this._device.createBuffer({
			size: 16 * Float32Array.BYTES_PER_ELEMENT,
			usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST,
		});

		this._device.queue.writeBuffer(this._nodeUniformBuffer, 0, this._node.modelMatrix);

		const nodeBindGroupLayout = this._device.createBindGroupLayout({
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

		this._nodeBindGroup = this._device.createBindGroup({
			layout: nodeBindGroupLayout,
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

		const nodePipelineLayout = this._device.createPipelineLayout({
			bindGroupLayouts: [nodeBindGroupLayout],
		});

		this._nodePipeline = this._device.createRenderPipeline({
			label: "particle render pipeline",
			layout: nodePipelineLayout,
			vertex: {
				module: particleShaderModule,
				entryPoint: "vs",
				buffers: [
					vertexBufferLayout,
					particleInstanceLayout
				]
			},
			fragment: {
				module: particleShaderModule,
				entryPoint: "fs",
				targets: [{
					format: this._bolt.presentationFormat
				}]
			},
			multiSample: {
				count: 4,
			},
			primitive: {
				topology: 'triangle-list',
				//cullMode: 'back',
			},
		})

    }

    update(camera) {

        this._device.queue.writeBuffer(this._viewUniformBuffer, 0, camera.projection);
		this._device.queue.writeBuffer(this._viewUniformBuffer, 16 * Float32Array.BYTES_PER_ELEMENT, camera.view);

        this._node.updateModelMatrix();
		this._device.queue.writeBuffer(this._nodeUniformBuffer, 0, this._node.modelMatrix);

        const renderEncoder = this._device.createCommandEncoder({
			label: "render encoder"
		});

		const renderPass = renderEncoder.beginRenderPass({
			colorAttachments: [{
				view: this._bolt.context.getCurrentTexture().createView(),
				loadOp: "clear",
				clearValue: { r: 0, g: 0, b: 0, a: 1 }, // New line
				storeOp: "store"
			}]
		});

        renderPass.setPipeline(this._nodePipeline);
		renderPass.setBindGroup(0, this._nodeBindGroup);
		renderPass.setVertexBuffer(0, this._triangleBuffer);
		renderPass.setVertexBuffer(1, this._compute.particleBuffers[0]);
		renderPass.draw(3, this._particleCount, 0, 0);

        renderPass.end();

		const renderCommandBuffer = renderEncoder.finish();
		this._device.queue.submit([renderCommandBuffer]);

    }

    get particleCount () {
        return this._particleCount;
    }
}