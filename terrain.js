import {defs, tiny} from './examples/common.js';


let counter = 0

/**
 * next_x_function: Take a progress ratio and a previous point value, returning a point value
 *
 * @param {number} progress_ratio
 * @param {tiny.Vector3?} prev_pt
 * @return tiny.Vector3
 */
function NextRowFunction(progress_ratio, prev_pt) {
  return tiny.Vector3.create(progress_ratio*10, progress_ratio*10, progress_ratio*10)
}

export class Terrain extends defs.Grid_Patch {
  constructor(subdivisions, leg_size) {
    const step = leg_size / subdivisions
    const initial_corner_point = tiny.vec3(-leg_size/2, -leg_size/2, 0);

    const column_operation = (t, p) => tiny.Mat4.translation(0, step, 0).times(p.to4(1)).to3();
    const row_operation = (s, p) => p ? tiny.Mat4.translation(step, 0, 0).times(p.to4(1)).to3()
      : initial_corner_point;

    super(subdivisions, subdivisions, row_operation, column_operation, [[0,8], [0,8]]);
  }
}
