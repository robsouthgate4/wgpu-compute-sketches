import { quat, vec3 } from "gl-matrix";

export default class BakedAnimation {

  constructor(channels) {
    this._channels = channels;
    this._currentAnimation = null;
    this._animationTime = 0;
    this._minTime = 0;
    this._maxTime = 0;
  }

  _setMinAndMaxTime() {
    const translations = Object.values(this._currentAnimation).map(
      ({ translation }) => translation
    );

    const rotations = Object.values(this._currentAnimation).map(
      ({ rotation }) => rotation
    );

    const scales = Object.values(this._currentAnimation).map(
      ({ scale }) => scale
    );

    const flattened = [].concat(...translations, ...rotations, ...scales);

    // find min time and max by object time properties
    this._minTime = Math.min(...flattened.map(({ time }) => time));
    this._maxTime = Math.max(...flattened.map(({ time }) => time));
  }

  runAnimation(animationName) {
    this._animationTime = 0;
    this._currentAnimation = this._channels[animationName];
    if (this._currentAnimation) {
      this._setMinAndMaxTime();
    }
  }

  _getKeyFrameTransform(keyframes) {

    // get the previous and next keyframes for each transform
    const nextPrevKeyFrames = this._getPrevAndNextKeyFrames(keyframes);
    const progression =
      (this._animationTime - nextPrevKeyFrames.prevKeyFrame.time) /
      (nextPrevKeyFrames.nextKeyFrame.time -
        nextPrevKeyFrames.prevKeyFrame.time);

    if (
      nextPrevKeyFrames.prevKeyFrame.type === "translation" ||
      nextPrevKeyFrames.prevKeyFrame.type === "scale"
    ) {
      const result = vec3.create(); // TODO: cache this
      vec3.lerp(
        result,
        nextPrevKeyFrames.prevKeyFrame.transform,
        nextPrevKeyFrames.nextKeyFrame.transform,
        progression
      );
      return result;
    } else {
      const result = quat.create(); // TODO: cache this
      quat.slerp(
        result,
        nextPrevKeyFrames.prevKeyFrame.transform,
        nextPrevKeyFrames.nextKeyFrame.transform,
        progression
      );
      return result;
    }
  }

  update(elapsed, delta) {
    if (!this._currentAnimation) return;

    this._animationTime += delta;

    this.play();
  }

  play() {
    if (this._animationTime > this._maxTime) {
      this._animationTime = this._minTime;
      this._animationTime = this._animationTime % this._maxTime;
    }

    // modulate the animation time by the max time
    Object.values(this._currentAnimation).forEach((transformData) => {
      const translationKeyframe = transformData.translation;
      const rotationKeyframe = transformData.rotation;
      const scaleKeyframe = transformData.scale;

      const t = this._getKeyFrameTransform(translationKeyframe);
      const r = this._getKeyFrameTransform(rotationKeyframe);
      const s = this._getKeyFrameTransform(scaleKeyframe);

      transformData.node.transform.position = t;
      transformData.node.transform.quaternion = r;
      transformData.node.transform.scale = s;

      transformData.node.updateModelMatrix();
    });
  }

  playFrame(frame) {
    if (!this._currentAnimation) return;

    this._animationTime = frame;

    this.play();
  }


  _cubicSplineInterpolate(
    t,
    prevVal,
    prevTan,
    nextTan,
    nextVal
  ){
    const t2 = t * t;
    const t3 = t2 * t;

    const s2 = 3 * t2 - 2 * t3;
    const s3 = t3 - t2;
    const s0 = 1 - s2;
    const s1 = s3 - t2 + t;

    for (let i = 0; i < prevVal.length; i++) {
      prevVal[i] =
        s0 * prevVal[i] +
        s1 * (1 - t) * prevTan[i] +
        s2 * nextVal[i] +
        s3 * t * nextTan[i];
    }

    return prevVal;
  }

  _getPrevAndNextKeyFrames(keyFrames) {
    let nextKeyFrame = keyFrames[0];
    let prevKeyFrame = keyFrames[0];

    for (let i = 1; i < keyFrames.length; i++) {
      nextKeyFrame = keyFrames[i];
      if (nextKeyFrame.time > this._animationTime) break;

      prevKeyFrame = keyFrames[i];
    }

    return { prevKeyFrame, nextKeyFrame };
  }
}