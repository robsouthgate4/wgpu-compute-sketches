import Base from "../Base";

import CameraMain from "../../globals/CameraMain";
import Controls from "../../globals/Controls";
import { BoltWGPU, Sphere } from "bolt-wgpu";
import Compute from "./Compute";
import ParticleRenderer from "./ParticleRenderer";
import ShadowRenderer from "./ShadowRenderer";


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
		this._currentCanvasWidth  = 0;
		this._currentCanvasHeight = 0;
	}

	async init() {

		this._cameraMain = CameraMain.getInstance();
		this._controls   = new Controls(this._cameraMain);
		this._bolt.setCamera(this._cameraMain);

		// const dracoLoader = new DracoLoader(this._bolt);
		// const geo = await dracoLoader.load("static/models/draco/bunny.drc");

		const geometry      = new Sphere({ radius: 1.5, widthSegments: 1600, heightSegments: 1600 });
		const { positions } = geometry;
		const startData     = new Float32Array(positions);
		const particleCount = positions.length / 3;

		this._compute = new Compute(this._bolt, {
			startData,
			particleCount
		});	

		this._particleRenderer = new ParticleRenderer(this._bolt, geometry, this._compute);
		this._shadowRenderer   = new ShadowRenderer(this._bolt, this._particleRenderer, this._compute);

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
			this._currentCanvasWidth  = this._bolt.canvas.width;
			this._currentCanvasHeight = this._bolt.canvas.height;
		}

		this._compute.update(elapsed, delta);
		this._controls.update();
		this._cameraMain.update();
		this._particleRenderer.update(this._cameraMain);
		this._shadowRenderer.update();
		
	}

	lateUpdate() {
		return;
	}
}
