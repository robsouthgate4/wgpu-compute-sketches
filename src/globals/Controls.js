import { Orbit } from "bolt-wgpu";

export default class Controls extends Orbit {
  constructor(camera) {
    super(camera, {
      zoomSpeed: 0.1,
      maxRadius: 50,
      minRadius: 0.5,
      rotateSpeed: 3,
      ease: 0.05,
      panSpeed: 2,
    });
  }
}
