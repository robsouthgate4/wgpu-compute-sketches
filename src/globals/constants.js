import "url-search-params-polyfill";
import { getSearchParam } from "../utils";

const isTouchDevice = () => {
  return navigator
    ? "ontouchstart" in window ||
        // @ts-ignore-disable-next-line
        (window.DocumentTouch && document instanceof window.DocumentTouch) ||
        navigator.maxTouchPoints ||
        false
    : false;
};

//NOT IN USE
const debug          = getSearchParam("debug");
const debugFPS       = getSearchParam("fps");
const debugDrawCount = getSearchParam("drawcount");
const debugGui       = getSearchParam("gui");
const debugControls  = getSearchParam("controls");
const debugCamera    = getSearchParam("debugcamera");

//NOT IN USE
const sceneSettings = {
  USE_POSTPROCESS: false,
  DPI: 2,
  DEBUG_FPS: false || (debug && debugFPS),
  DEBUG_DRAW_COUNT: false || (debug && debugDrawCount),
  USE_ORBIT_CONTROLS: false || (debug && debugControls),
  USE_DEBUG_CAMERA: false || (debug && debugCamera),
  USE_GUI: false || (debug && debugGui),
  SHADOW_MAP_SIZE: 2048,
  PARTICLE_SCALE: 0.085,
  PARTICLE_COUNT: 800000,
  LIGHT_NEAR: 0.1,
  LIGHT_FAR: 100,
};

const xrSettings = {};

export { isTouchDevice, sceneSettings, xrSettings };
