import Base from "../Base";

import CameraMain from "../../globals/CameraMain";
import Controls from "../../globals/Controls";
import { BoltWGPU, CameraOrtho, Node, Plane, Sphere } from "bolt-wgpu";
import Compute from "./Compute";
import ParticleRenderer from "./ParticleRenderer";
import ShadowRenderer from "./ShadowRenderer";
import RenderFullScreen from "./RenderFullScreen";
import {vec3 } from "gl-matrix";
import GeometryRenderer from "./GeometryRenderer";
import { basicShader } from "./shaders/basicShader";
//import { basicShadowShader } from "./shaders/basicShadowShader";
import ShadowParticleRenderer from "./ShadowParticleRenderer";
import { floorShader } from "./shaders/floorShader";
import { sceneSettings } from "../../globals/constants";


export default class extends Base {

	constructor() {
		super();
		this._bolt                = BoltWGPU.getInstance();
		this._device              = this._bolt.device;
		this._triangleBuffer      = null;
		this._particleNode        = null;
		this._viewUniformBuffer   = null;
		this._nodePipeline        = null;
		this._nodeBindGroup       = null;
		this._light               = null;
		this._currentCanvasWidth  = 0;
		this._currentCanvasHeight = 0;
		this._shadowTextureSize   = sceneSettings.SHADOW_MAP_SIZE;
		this._renderTexture       = null;
		this._renderTextureView   = null;
		this._lightProjection     = null;
	}

	async init() {

		this._cameraMain = CameraMain.getInstance();

		this._light = new CameraOrtho({
			left: -6,
			right: 6,
			top: 6,
			bottom: -6,
			near: 0.1,
			far: 100,
			position: vec3.fromValues(0, 20, -1),
			lookAt: vec3.fromValues(0, 0, 0),
			webgpu: true,
		})

		this._light.lookAt(vec3.fromValues(0, 0, 0));
	
		this._controls = new Controls(this._cameraMain);

		//const objectGeometry                 = new Sphere({ radius: 3, widthSegments: 10, heightSegments: 10 });
		const particleCount = sceneSettings.PARTICLE_COUNT;
		const startData                      = new Float32Array(particleCount * 3);

		for (let i = 0; i < particleCount; i++) {
			// scatter in a sphere volume
			const r = Math.random();
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.random() * Math.PI * 2;
			const x = Math.sin(theta) * Math.cos(phi) * r * 3.5;
			const y = Math.cos(theta) * r * 3.5;
			const z = Math.sin(theta) * Math.sin(phi) * r * 3.5;
			startData[i * 3] = x;
			startData[i * 3 + 1] = y;
			startData[i * 3 + 2] = z;
		}


		const planeGeometry = new Plane({ width: 1, height: 1, widthSegments: 10, heightSegments: 10 });

		this._compute = new Compute(this._bolt, {
			startData,
			particleCount
		});

		await this._compute.init();

		this._particleNode = new Node();
		this._particleNode.transform.positionY = 1.5;
		this._particleNode.transform.scale = vec3.fromValues(50, 50, 50);
		this._particleNode.updateModelMatrix();

		const sceneBufferSize =  // view matrix + projection matrix + camera quaternion
			16 * Float32Array.BYTES_PER_ELEMENT +
			16 * Float32Array.BYTES_PER_ELEMENT +
			4 * Float32Array.BYTES_PER_ELEMENT;

		this._sceneUniformBuffer = this._device.createBuffer({ // shared scene data buffer
			size: sceneBufferSize,
			usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST,
		});

		this._particlesUniformBuffer = this._device.createBuffer({
			size: 16 * Float32Array.BYTES_PER_ELEMENT,
			usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST,
		});

		this._device.queue.writeBuffer(this._particlesUniformBuffer, 0, this._particleNode.modelMatrix);

		// Particle geometry is a triangle ( for now )
		const triangleArray = new Float32Array([
			-0.5, -0.5, 0.0,
			0.5, -0.5, 0.0,
			0.0, 0.5, 0.0
		]);

		this._triangleBuffer = this._device.createBuffer({
			label: "Triangle vertices buffer",
			size : triangleArray.byteLength,
			usage: window.GPUBufferUsage.VERTEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
		});

		this._device.queue.writeBuffer(this._triangleBuffer, 0, triangleArray);

		const lightUniformBufferSize =  // view matrix + projection matrix
			16 * Float32Array.BYTES_PER_ELEMENT +
			16 * Float32Array.BYTES_PER_ELEMENT;

		this._lightUniformBuffer = this._device.createBuffer({
			size: lightUniformBufferSize,
			usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST,
		});		

		this._shadowDepthTexture = this._device.createTexture({
			size: [this._shadowTextureSize, this._shadowTextureSize, 1],
			usage: window.GPUTextureUsage.RENDER_ATTACHMENT | window.GPUTextureUsage.TEXTURE_BINDING,
			format: "depth32float",
		});

		const sharedData = {
			node              : this._particleNode,
			triangleBuffer    : this._triangleBuffer,
			sceneUniformBuffer: this._sceneUniformBuffer,
			nodeUniformBuffer : this._particlesUniformBuffer,
			lightUniformBuffer: this._lightUniformBuffer,
			particleCount     : particleCount,
			compute           : this._compute,
			light             : this._light,
			shadowTexture     : this._shadowDepthTexture,
		}

		this._particleRenderer = new ParticleRenderer(this._bolt, sharedData);

		this._renderFullScreen = new RenderFullScreen(this._bolt, this._shadowDepthTexture);

		this._objRenderer   = new GeometryRenderer(this._bolt, sharedData, new Sphere({ radius: 3, widthSegments: 32, heightSegments: 32 }), basicShader);
		this._objRenderer.node.transform.positionY = 6.5;
		this._objRenderer.node.transform.positionX = 0;

		this._floorRenderer    = new GeometryRenderer(this._bolt, sharedData, planeGeometry, floorShader);

		this._objectShadowRenderer = new ShadowRenderer(
			this._bolt,
			sharedData,
			[
				this._objRenderer
			]	
		)

		this._particleShadowRenderer = new ShadowParticleRenderer(
			this._bolt,
			sharedData
		)

		this._floorRenderer.node.transform.positionY = 0;
		this._floorRenderer.node.transform.scale = vec3.fromValues(200, 200, 200);
		this._floorRenderer.node.transform.rotationX = -90;

		this.initRenderTextures();
		this.start();


	}

	initRenderTextures() {

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
			format: 'depth24plus-stencil8',
			sampleCount: 4,
			usage: window.GPUTextureUsage.RENDER_ATTACHMENT,
		});

		this._depthTextureView = this._depthTexture.createView();

	}

	resize() {

		this.initRenderTextures();

		// this._particleRenderer.resize();
		// this._shadowRenderer.resize();
		this._bolt.resizeCanvasToDisplay();
		this._cameraMain.updateProjection(window.innerWidth / window.innerHeight, true);

	}

	earlyUpdate() {
		return;
	}

	async update(elapsed, delta) {

		if (this._currentCanvasWidth !== this._bolt.canvas.width || this._currentCanvasHeight !== this._bolt.canvas.height) {

			this.resize();

			this._particleRenderer.resizeTextures();
			this._renderFullScreen.resizeTextures();
			this._currentCanvasWidth = this._bolt.canvas.width;
			this._currentCanvasHeight = this._bolt.canvas.height;

		}

		this._device.queue.writeBuffer(this._lightUniformBuffer, 0, new Float32Array([
			...this._light.projection,
			...this._light.view
		]));

		this._device.queue.writeBuffer(this._sceneUniformBuffer, 0, new Float32Array([
			...this._cameraMain.projection,
			...this._cameraMain.view,
			...this._cameraMain.transform.quaternion
		]));

		this._device.queue.writeBuffer(this._particlesUniformBuffer, 0, this._particleNode.modelMatrix);

		this._compute.update(elapsed, delta);
		this._controls.update();
		this._cameraMain.update();


		const commandEncoder = this._device.createCommandEncoder();

		this._renderPassDescriptor = {
			colorAttachments: [{
				view: this._renderTextureView,
				resolveTarget: this._bolt.context.getCurrentTexture().createView(),
				clearValue: { r: 0.82, g: 0.82, b: 0.82, a: 1 },
				//clearValue: { r: 0, g: 0, b: 0, a: 1 },
				loadOp: 'clear',
				storeOp: 'store',
			}],
			depthStencilAttachment: {
				view: this._depthTextureView,
				depthClearValue: 1,
				depthLoadOp: 'clear',
				depthStoreOp: 'store',
				stencilClearValue: 0,
				stencilLoadOp: 'clear',
				stencilStoreOp: 'store',
			}
		}


		this._particleShadowRenderer.render(commandEncoder);
		//this._objectShadowRenderer.draw(commandEncoder);
		
		const renderPass = commandEncoder.beginRenderPass(this._renderPassDescriptor);
		
		this._particleRenderer.update(renderPass);

		//this._objRenderer.draw(renderPass);
		this._floorRenderer.draw(renderPass);
		//this._renderFullScreen.render(renderPass);
		
		renderPass.end();

		this._device.queue.submit([commandEncoder.finish()]);

	}

	lateUpdate() {
		return;
	}
}
