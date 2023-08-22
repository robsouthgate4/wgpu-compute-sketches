import Base from "../Base";

import CameraMain from "../../globals/CameraMain";
import Controls from "../../globals/Controls";
import { BoltWGPU, CameraOrtho, Node, Sphere } from "bolt-wgpu";
import Compute from "./Compute";
import ParticleRenderer from "./ParticleRenderer";
import ShadowRenderer from "./ShadowRenderer";
import RenderFullScreen from "./RenderFullScreen";
import { vec3 } from "gl-matrix";


export default class extends Base {

	constructor() {
		super();
		this._bolt                = BoltWGPU.getInstance();
		this._device              = this._bolt.device;
		this._triangleBuffer      = null;
		this._node                = null;
		this._viewUniformBuffer   = null;
		this._nodePipeline        = null;
		this._nodeBindGroup       = null;
		this._light               = null;
		this._currentCanvasWidth  = 0;
		this._currentCanvasHeight = 0;
		this._shadowTextureSize   = 1024;
	}

	async init() {

		this._cameraMain = CameraMain.getInstance();
		

		// const dracoLoader = new DracoLoader(this._bolt);
		// const geo = await dracoLoader.load("static/models/draco/bunny.drc");

        this._light = new CameraOrtho({
			left: -5,
			right: 5,
			top: 5,
			bottom: -5,
			near: 0.001,
			far: 100,
			position: vec3.fromValues(10, 50, 0.01)
		});
		
		this._light.transform.lookAt(vec3.fromValues(0, 0, 0));

		this._controls   = new Controls(this._cameraMain);

		const geometry      = new Sphere({ radius: 1.5, widthSegments: 1600, heightSegments: 1600 });
		const { positions } = geometry;
		const startData     = new Float32Array(positions);
		const particleCount = positions.length / 3;

		this._compute = new Compute(this._bolt, {
			startData,
			particleCount
		});	

		this._node                     = new Node();
		this._node.transform.positionY = 0;
		this._node.transform.scale     = vec3.fromValues(1.4, 1.4, 1.4);

		const sceneBufferSize =  // view matrix + projection matrix + quaternion
            16 * Float32Array.BYTES_PER_ELEMENT +
            16 * Float32Array.BYTES_PER_ELEMENT +
            4 * Float32Array.BYTES_PER_ELEMENT;

        this._sceneUniformBuffer = this._device.createBuffer({ // should be shared with the main renderer
            size: sceneBufferSize,
            usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST,
        });

		this._nodeUniformBuffer = this._device.createBuffer({
			size: 16 * Float32Array.BYTES_PER_ELEMENT,
			usage: window.GPUBufferUsage.UNIFORM | window.GPUBufferUsage.COPY_DST,
		});

		this._device.queue.writeBuffer(this._nodeUniformBuffer, 0, this._node.modelMatrix);

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
			node              : this._node,
			triangleBuffer    : this._triangleBuffer,
			sceneUniformBuffer: this._sceneUniformBuffer,
			nodeUniformBuffer : this._nodeUniformBuffer,
			lightUniformBuffer: this._lightUniformBuffer,
			particleCount     : particleCount,
			compute           : this._compute,
			light             : this._light,
			shadowTexture     : this._shadowDepthTexture,
		}

		this._shadowRenderer   = new ShadowRenderer(this._bolt, sharedData);
		this._particleRenderer = new ParticleRenderer(this._bolt, sharedData);
		this._renderFullScreen = new RenderFullScreen(this._bolt, this._shadowDepthTexture);
		
		this.start();

	}


	resize() {

		this._particleRenderer.resize();
		this._shadowRenderer.resize();
		this._bolt.resizeCanvasToDisplay();
		this._cameraMain.updateProjection(window.innerWidth / window.innerHeight);

	}

	earlyUpdate() {
		return;
	}

	async update(elapsed, delta) {

		if (this._currentCanvasWidth !== this._bolt.canvas.width || this._currentCanvasHeight !== this._bolt.canvas.height) {
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

		this._node.updateModelMatrix();
		
		this._device.queue.writeBuffer(this._nodeUniformBuffer, 0, this._node.modelMatrix);

		this._compute.update(elapsed, delta);
		this._controls.update();
		this._cameraMain.update();
		this._light.updateModelMatrix();

		const commandEncoder = this._device.createCommandEncoder();
		
		this._shadowRenderer.update(commandEncoder);
		this._particleRenderer.update(this._cameraMain, commandEncoder);

		this._renderFullScreen.render(commandEncoder);

		this._device.queue.submit([commandEncoder.finish()]);
		
	}

	lateUpdate() {
		return;
	}
}
