import { CameraPersp } from "bolt-wgpu";
import { vec3 } from "gl-matrix";

export default class CameraMain extends CameraPersp {

  constructor() {
    
    super({
      aspect  : window.innerWidth / window.innerHeight,
      fov     : 45,
      near    : 0.001,
      far     : 1000,
      position: vec3.fromValues(0, 0, 7),
      target  : vec3.fromValues(0, 0, 0),
    });
    this._instance = null;
  }

  static getInstance() {
    if (!CameraMain._instance) CameraMain._instance = new this();
    return CameraMain._instance;
  }
}
