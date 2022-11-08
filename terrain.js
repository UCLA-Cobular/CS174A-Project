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
const initial_corner_point = tiny.vec3(-1, -1, 0);
const row_operation = (s, p) => p ? tiny.Mat4.translation(0, 1.0, counter++ * 0.01).times(p.to4(1)).to3()
  : initial_corner_point;
const column_operation = (t, p) => tiny.Mat4.translation(1.0, 0, counter++ * 0.01).times(p.to4(1)).to3();

export class Terrain extends defs.Grid_Patch {
  constructor(subdivisions) {
    super(10, 10, row_operation, column_operation);
  }
}
