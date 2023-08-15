import Stats from "stats.js";

import { Clock, EventListeners } from "bolt-wgpu";
import { GL_UPDATE_TOPIC } from "../common/events";

export default class Base {

  constructor() {
    this.now = Date.now();
    this.isRunning = false;
    this.requestFrame;
    this.elapsed = 0;
    this.delta = 0;

    this._eventListeners = EventListeners.getInstance();
    this._clock = new Clock();

    this.delta = 0;
    (this.lastTime = new Date().getTime()),
      (this.currentTime = 0),
      (this.delta = 0);

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    const DEBUG_FPS = true;

    if (DEBUG_FPS) {
      this.stats = new Stats();
      this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
      document.body.appendChild(this.stats.dom);
    }

    document.addEventListener("visibilitychange", () => {
      document.visibilityState === "visible" ? this.start() : this.pause();
    });
  }

  start() {
    this._clock.start();
    this.isRunning = true;
    this.run();
  }

  destroy() {
    if (this.requestFrame) {
      cancelAnimationFrame(this.requestFrame);
      this.requestFrame = undefined;
    }
  }

  pause() {
    if (this.requestFrame) {
      cancelAnimationFrame(this.requestFrame);
      this.requestFrame = undefined;
    }

    this.isRunning = false;
  }

  earlyUpdate(elapsed, delta) {}

  update(elapsed, delta) {}

  lateUpdate(elapsed, delta) {}

  run() {
    const DEBUG_FPS = true;

    if (DEBUG_FPS) this.stats?.begin();

    this.delta = this._clock.getDelta();
    this.elapsed = this._clock.getElapsedTime();

    this.earlyUpdate(this.elapsed, this.delta);
    this.update(this.elapsed, this.delta);
    this.lateUpdate(this.elapsed, this.delta);

    this._eventListeners.publish(GL_UPDATE_TOPIC, {
      elapsed: this.elapsed,
      delta: this.delta,
    });

    if (DEBUG_FPS) this.stats?.end();

    if (this.isRunning) {
      this.requestFrame = requestAnimationFrame(this.run.bind(this));
    }
  }
}
