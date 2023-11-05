import { Orbit } from "bolt-wgpu";

export default class Controls extends Orbit {
  constructor(camera) {
    super(camera, {
      zoomSpeed: 0.2,
      maxRadius: 50,
      minRadius: 0.5,
      rotateSpeed: 6,
      ease: 0.05,
      panSpeed: 2,
      minElevation: 0,
      maxElevation: Math.PI / 2,
    });
  }
}
