import {defs, tiny} from "./examples/common.js";


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

function random(a, b) {
  // fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);

  // const dot = a * 12.9898 + b * 78.233;
  // const sin = Math.sin(dot)
  // const prefract = sin * 43758.5453123
  // return prefract % 1
  return (Math.sin(a * 12.9898 + b * 78.233) * 43758.5453123) % 1
}

function noise (x, y) {
  // vec2 i = floor(st);
  // vec2 f = fract(st);
  //
  // // Four corners in 2D of a tile
  // float a = random(i);
  // float b = random(i + vec2(1.0, 0.0));
  // float c = random(i + vec2(0.0, 1.0));
  // float d = random(i + vec2(1.0, 1.0));
  //
  // // Smooth Interpolation
  //
  // // Cubic Hermine Curve.  Same as SmoothStep()
  // vec2 u = f*f*(3.0-2.0*f);
  // // u = smoothstep(0.,1.,f);
  //
  // // Mix 4 coorners percentages
  // return mix(a, b, u.x) +
  //   (c - a)* u.y * (1.0 - u.x) +
  //   (d - b) * u.x * u.y;

  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x % 1, fy = y % 1

  const ra = random(ix, iy);
  const rb = random(ix + 1.0, iy);
  const rc = random(ix, iy + 1.0);
  const rd = random(ix + 1.0, iy + 1.0);

  const ux = fx * fx * (3-2*fx);
  const uy = fy * fy * (3-2*fy);

  return ((1 - ux) * (ra) + (rb * ux)) +
    (rc - ra) * uy * (1.0 - ux) +
    (rd - rb) * ux * uy;
}

function multi_octave_noise(a, b, amp_scale, freq_scale) {
  // float pt = 0.0;
  // float amplitude = 0.5;
  // float freq = 1.0;
  // st *= 8.;
  //
  // #define OCTAVES 8
  // for (int i = 0; i < OCTAVES; i++) {
  //   pt += amplitude * noise(st * freq);
  //   amplitude *= amp_scale;
  //   freq *= freq_scale;
  // }
  //
  // return pt;

  let pt = 0;
  let amplitude = 0.5;
  let freq = 1.0;

  a *= 8;
  b *= 8;

  for (let i = 0; i < 4; i++) {
      pt += amplitude * noise(a * freq, b * freq);
      amplitude *= amp_scale;
      freq *= freq_scale;
  }

  return pt
}

function circle_texture(a, b) {
  // float circle_texture(vec2 ft) {
  //   vec2 radial_coord = (ft-0.5)*2.;
  //   float modified_len = pow(length(radial_coord), 2.2);
  //   return 1.-modified_len;
  // }


}

let max_a = 0;

function multi_octave_noise_wrapped(a, b) {
  // return multi_octave_noise(ft * 2., 0.47, 2.5) * circle_texture(ft);
  return multi_octave_noise(a, b, 0.3, 2.1);
}

export class Terrain extends defs.Grid_Patch {
  constructor(subdivisions, leg_size) {
    const step = leg_size / subdivisions
    const initial_corner_point = tiny.vec3(-leg_size/2, 0, -leg_size/2);

    const x_translation = tiny.Mat4.translation(step, 0, 0);
    const result = tiny.Vector4.create(0,0,0,0);

    const column_operation = (c, p, r) => {
      const res = x_translation.mat_times_vec_pre(p.to4(1), result);

      res[1] = multi_octave_noise_wrapped(r, c) * 80;
      return res.to3();
    };
    const row_operation = (r, p) => p ? tiny.Mat4.translation(0, 0, step).times(p.to4(1)).to3()
      : initial_corner_point;

    super(subdivisions, subdivisions, row_operation, column_operation, [[0,1], [0,1]]);
  }
}
