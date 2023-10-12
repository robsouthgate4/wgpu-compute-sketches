import { CameraPersp } from "bolt-wgpu";
import { vec3 } from "gl-matrix";

export default class CameraMain extends CameraPersp {

  constructor() {
    
    super({
      aspect  : window.innerWidth / window.innerHeight,
      fov     : 45,
      near    : 0.01,
      far     : 100,
      position: vec3.fromValues(10, 8, 20),
      target  : vec3.fromValues(0, 6, 0),
      webgpu  : true
    });
    this._instance = null;
  }

  static getInstance() {
    if (!CameraMain._instance) CameraMain._instance = new this();
    return CameraMain._instance;
  }
}
