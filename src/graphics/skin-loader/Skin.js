import { mat4 } from "gl-matrix";

export default class Skin {

  constructor(joints, inverseBindMatrixData) {

    this._joints = joints;
    this._inverseBindMatrices = [];
    this._jointMatrices = [];
    this._globalWorldInverse = mat4.create();

    const mat4size = 4 * 4;
    this._jointData = new Float32Array(this._joints.length * mat4size);
    this._jointData.fill(0);

    for (let i = 0; i < joints.length; i++) {
      this._inverseBindMatrices.push(
        new Float32Array(
          inverseBindMatrixData.buffer,
          inverseBindMatrixData.byteOffset +
            Float32Array.BYTES_PER_ELEMENT * mat4size * i,
          mat4size
        )
      );

      this._jointMatrices.push(
        new Float32Array(
          this._jointData.buffer,
          Float32Array.BYTES_PER_ELEMENT * mat4size * i,
          mat4size
        )
      );
    }

  }

  update(node) {
    mat4.invert(this._globalWorldInverse, node.worldMatrix);

    // apply inverse bind matrix to each joint
    for (let i = 0; i < this._joints.length; i++) {
      const joint = this._joints[i];

      const dst = this._jointMatrices[i];

      mat4.multiply(dst, this._globalWorldInverse, joint.modelMatrix);
      mat4.multiply(dst, dst, this._inverseBindMatrices[i]);
    }
  }

  get jointData() {
    return this._jointData;
  }

  get joints() {
    return this._joints;
  }

  get jointMatrices() {
    return this._jointMatrices;
  }
}
