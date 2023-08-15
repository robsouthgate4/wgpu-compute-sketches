import Sketch from "@/graphics/sketches/ComputeSketch.js";
import { BoltWGPU, EventListeners, GL_RESIZE_TOPIC } from "bolt-wgpu";
export default class Main {

  _resize() {
    this._sketch.resize();
  }

  async load() {
    this._width = window.innerWidth;
    this._height = window.innerHeight;

    this._eventListeners = EventListeners.getInstance();

    this._canvas = document.getElementById("experience");
    this._canvas.width = this._width;
    this._canvas.height = this._height;

    this._eventListeners.setBoundElement(this._canvas);
    this._eventListeners.listen(GL_RESIZE_TOPIC, this._resize.bind(this));
    
    this._bolt = BoltWGPU.getInstance();

    // Bolt webgpu instantiation is async, webgl is not
    await this._bolt.init( this._canvas, {});
    this._sketch = new Sketch();
    this._sketch.init();
    
  }
}
