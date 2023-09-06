import Base from "../Base";

import CameraMain from "../../globals/CameraMain";
import Controls from "../../globals/Controls";
import { BoltWGPU, CameraOrtho, DracoLoader, Node, Plane, Sphere } from "bolt-wgpu";
import Compute from "./Compute";
import ParticleRenderer from "./ParticleRenderer";
import ShadowRenderer from "./ShadowRenderer";
import RenderFullScreen from "./RenderFullScreen";
import { vec3 } from "gl-matrix";
import GeometryRenderer from "./GeometryRenderer";
import { basicShader } from "./shaders/basicShader";
import { basicShadowShader } from "./shaders/basicShadowShader";


export default class extends Base {

	constructor() {
		super();
		this._bolt                = BoltWGPU.getInstance();
		this._device              = this._bolt.device;
		this._triangleBuffer      = null;
		this._particleNode                = null;
		this._viewUniformBuffer   = null;
		this._nodePipeline        = null;
		this._nodeBindGroup       = null;
		this._light               = null;
		this._currentCanvasWidth  = 0;
		this._currentCanvasHeight = 0;
		this._shadowTextureSize   = 1024;
		this._renderTexture	   	  = null;
		this._renderTextureView   = null;
	}

	async init() {

		this._cameraMain = CameraMain.getInstance();
		
		const dracoLoader = new DracoLoader(this._bolt);
		const bunnygeo = await dracoLoader.load("static/models/draco/bunny.drc");

		const frustumSize = 7;

		this._light = new CameraOrtho( {
			left: - frustumSize,
			right: frustumSize,
			bottom: - frustumSize,
			top: frustumSize,
			near: 0.1,
			far: 20,
			position: vec3.fromValues( 10, 10, 0.1 ),
			target: vec3.fromValues( 0, 0, 0 ),
		} );

		this._controls   = new Controls(this._cameraMain);

		const sphereGeometry      = new Sphere({ radius: 1.5, widthSegments: 32, heightSegments: 32 });
		const { positions: spherePositions } = sphereGeometry;
		const startData     = new Float32Array(spherePositions);
		const particleCount = spherePositions.length / 3;

		const planeGeometry = new Plane({ width: 1, height: 1, widthSegments: 10, heightSegments: 10 });

		this._compute = new Compute(this._bolt, {
			startData,
			particleCount
		});	

		this._particleNode                     = new Node();
		this._particleNode.transform.positionY = 0;
		this._particleNode.transform.scale     = vec3.fromValues(1.0, 1.0, 1.0);

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
			size: triangleArray.byteLength,
			usage: window.GPUBufferUsage.VERTEX | window.GPUBufferUsage.STORAGE | window.GPUBufferUsage.COPY_SRC | window.GPUBufferUsage.COPY_DST,
		});

		this._device.queue.writeBuffer(this._triangleBuffer, 0, triangleArray);

		const lightUniformBufferSize =  // view matrix + projection matrix + quaternion
			16 * Float32Array.BYTES_PER_ELEMENT +
			16 * Float32Array.BYTES_PER_ELEMENT +
			4 * Float32Array.BYTES_PER_ELEMENT;

		this._lightUniformBuffer = this._device.createBuffer({
			size: lightUniformBufferSize,
			usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST,
		});

		this._device.queue.writeBuffer(this._lightUniformBuffer, 0, new Float32Array([
			...this._light.projection,
			...this._light.view,
			...this._light.transform.quaternion
		]));

		this._shadowDepthTexture = this._device.createTexture({
            size: [this._shadowTextureSize, this._shadowTextureSize, 1],
            usage: window.GPUTextureUsage.RENDER_ATTACHMENT | window.GPUTextureUsage.TEXTURE_BINDING,
            format: "depth32float",
        });

        this._light.shadowTexture = this._shadowDepthTexture;

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

		//this._shadowRenderer   = new ShadowRenderer(this._bolt, sharedData);
		this._particleRenderer = new ParticleRenderer(this._bolt, sharedData);
		this._renderFullScreen = new RenderFullScreen(this._bolt, this._shadowDepthTexture);
		this._sphereRenderer   = new GeometryRenderer(this._bolt, sharedData, sphereGeometry, basicShader);
		this._floorRenderer    = new GeometryRenderer(this._bolt, sharedData, planeGeometry, basicShadowShader);

		this._sphereShadowRenderer = new ShadowRenderer(
										this._bolt, 
										sharedData, 
										this._sphereRenderer.vertexBufferLayout,
										this._sphereRenderer.interleavedBuffer,
										this._sphereRenderer.nodeUniformBuffer,
										this._sphereRenderer.indexBuffer,
										this._sphereRenderer.indexCount
									);

		this._floorRenderer.node.transform.positionY = -1.5;
		this._floorRenderer.node.transform.scale = vec3.fromValues(20, 20, 20);
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
			format: 'depth24plus',
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
		this._cameraMain.updateProjection(window.innerWidth / window.innerHeight);

	}

	earlyUpdate() {
		return;
	}

	async update(elapsed, delta) {

		console.log(elapsed)

		


		if (this._currentCanvasWidth !== this._bolt.canvas.width || this._currentCanvasHeight !== this._bolt.canvas.height) {

			this.resize();

			this._particleRenderer.resizeTextures();
			this._renderFullScreen.resizeTextures();
			this._currentCanvasWidth  = this._bolt.canvas.width;
			this._currentCanvasHeight = this._bolt.canvas.height;

		}

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

		this._sphereShadowRenderer.draw(commandEncoder);
		
		const renderPass = commandEncoder.beginRenderPass(this._renderPassDescriptor);
		
		//this._shadowRenderer.update(commandEncoder);
		//this._particleRenderer.update(renderPass);		
		
		this._sphereRenderer.draw(renderPass);
		this._floorRenderer.draw(renderPass);
		this._renderFullScreen.render(renderPass);
		
		renderPass.end();
		
		this._device.queue.submit([commandEncoder.finish()]);
		
	}

	lateUpdate() {
		return;
	}
}
