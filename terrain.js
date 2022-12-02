import {defs, tiny} from "./examples/common.js";

const Phong_Shader = defs.Phong_Shader;


/**
 * next_x_function: Take a progress ratio and a previous point value, returning a point value
 *
 * @param {number} progress_ratio
 * @param {tiny.Vector3?} prev_pt
 * @return tiny.Vector3
 */
function NextRowFunction(progress_ratio, prev_pt) {
  return tiny.Vector3.create(progress_ratio * 10, progress_ratio * 10, progress_ratio * 10);
}

function random(a, b) {
  // fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);

  // const dot = a * 12.9898 + b * 78.233;
  // const sin = Math.sin(dot)
  // const prefract = sin * 43758.5453123
  // return prefract % 1
  return (Math.sin(a * 12.9898 + b * 78.233) * 43758.5453123) % 1;
}

function noise(x, y) {
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
  const fx = x % 1, fy = y % 1;

  const ra = random(ix, iy);
  const rb = random(ix + 1.0, iy);
  const rc = random(ix, iy + 1.0);
  const rd = random(ix + 1.0, iy + 1.0);

  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

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

  return pt;
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
    const step = leg_size / subdivisions;
    const initial_corner_point = tiny.vec3(-leg_size / 2, 0, -leg_size / 2);

    const column_operation = (t, p) => tiny.Mat4.translation(step, 0, 0).times(p.to4(1)).to3();
    const row_operation = (s, p) => p ? tiny.Mat4.translation(0, 0, step).times(p.to4(1)).to3()
      : initial_corner_point;

    super(subdivisions, subdivisions, row_operation, column_operation, [[0, 1], [0, 1]]);
  }
}

export class MountainShader extends Phong_Shader {
  constructor(seed_1 = "12.9898", seed_2 = "78.233", seed_3 = "43758.5453123", num_lights = 2) {
    super();
    this.num_lights = num_lights;
    this.seed_1 = seed_1;
    this.seed_2 = seed_2;
    this.seed_3 = seed_3;
  }

  shared_glsl_code() {
    return super.shared_glsl_code() + `
                float det_random_2d(vec2 st) {
                    // This gives us what's basically a determanistic 2d random number. To change the seed, mix up 
                    // the constants.
                    return fract(sin(dot(st.xy, vec2(${this.seed_1},${this.seed_2}))) * ${this.seed_3});
                }
                
                float det_random_2d_b(vec2 st) {
                    // This gives us what's basically a determanistic 2d random number. To change the seed, mix up 
                    // the constants.
                    return fract(sin(dot(st.xy, vec2(${this.seed_1}32,${this.seed_2}12))) * ${this.seed_3}54);
                }
                
                float gen_noise(vec2 pt) {
                    // We'll need these parts later!
                    vec2 integer = floor(pt);
                    vec2 fraction = fract(pt);
                
                    // We sample four corners for the math below
                    float bl = det_random_2d(integer);
                    float br = det_random_2d(integer + vec2(1.0, 0.0));
                    float tl = det_random_2d(integer + vec2(0.0, 1.0));
                    float tr = det_random_2d(integer + vec2(1.0, 1.0));
                    
                    // A basic smoothstep - basically we use \`3x^{2}-2x^{3}\` to get a smooth curve between 0 and 1
                    vec2 smoothed = fraction * fraction * (3.0 - 2.0 * fraction);
                
                    // Here, we basically mix the corners by the smoothed fractional values to get one float value 
                    //  for this point.
                    return mix(bl, br, smoothed.x) +
                    (tl - bl)* smoothed.y * (1.0 - smoothed.x) +
                    (tr - br) * smoothed.x * smoothed.y;
                }
                
                float gen_noise_b(vec2 pt) {
                    // We'll need these parts later!
                    vec2 integer = floor(pt);
                    vec2 fraction = fract(pt);
                
                    // We sample four corners for the math below
                    float bl = det_random_2d_b(integer);
                    float br = det_random_2d_b(integer + vec2(1.0, 0.0));
                    float tl = det_random_2d_b(integer + vec2(0.0, 1.0));
                    float tr = det_random_2d_b(integer + vec2(1.0, 1.0));
                    
                    // A basic smoothstep - basically we use \`3x^{2}-2x^{3}\` to get a smooth curve between 0 and 1
                    vec2 smoothed = fraction * fraction * (3.0 - 2.0 * fraction);
                
                    // Here, we basically mix the corners by the smoothed fractional values to get one float value 
                    //  for this point.
                    return mix(bl, br, smoothed.x) +
                    (tl - bl)* smoothed.y * (1.0 - smoothed.x) +
                    (tr - br) * smoothed.x * smoothed.y;
                }
                
                // Layer multiple octaves of noise! In this case 8 ocataves
                // Pretty simple, it just loops over the noise function, shrinking down each time
                float multi_octave_noise(vec2 pt, float amp_scale, float freq_scale) {
                    float accumulator = 0.0;
                    float starting_amplitude = 0.55;
                    float starting_freq = 1.0;
                    pt *= 8.;
                    
                    #define OCTAVES 8
                    for (int i = 0; i < OCTAVES; i++) {
                          // Ignore octives 4-7
                          // if (i < 4 || i > 6) {
                            accumulator += starting_amplitude * gen_noise(pt * starting_freq);
                            starting_amplitude *= amp_scale;
                            starting_freq *= freq_scale;
                          // };
                    }
                    
                    return accumulator;
                }
                
                // Layer multiple octaves of noise! In this case 8 ocataves
                // Pretty simple, it just loops over the noise function, shrinking down each time
                float multi_octave_noise_b(vec2 pt, float amp_scale, float freq_scale) {
                    float accumulator = 0.0;
                    float starting_amplitude = 0.55;
                    float starting_freq = 1.0;
                    pt *= 8.;
                    
                    #define OCTAVES_B 8
                    for (int i = 0; i < OCTAVES_B; i++) {
                          // Ignore octaves 4-6
                          accumulator += starting_amplitude * gen_noise_b(pt * starting_freq);
                          starting_amplitude *= amp_scale;
                          starting_freq *= freq_scale;
                    }
                    
                    return accumulator;
                }
                
                float single_octave_noise(vec2 pt, float amp_scale, float freq_scale) {
                    float accumulator = 0.0;
                    float starting_amplitude = 0.55;
                    float starting_freq = 1.0;
                    pt *= 8.;
                    
                    accumulator += starting_amplitude * gen_noise(pt * starting_freq);
                                        
                    return accumulator;
                }
                
                // A really simple circle texture. We'll use this to make a circle mask
                float circle_texture(vec2 ft) {
                  vec2 radial_coord = (ft-0.5)*2.;
                  float modified_len = pow(length(radial_coord), 2.2);
                  return 1.-modified_len;
                }
                
                #define AMP_SCALE 0.46
                #define FREQ_SCALE 2.
               
                // Wrap the noise function with some default values for params plus the circle mask.
                float multi_octave_noise_wrapped(vec2 ft) {
                    float circle = circle_texture(ft);
                    float noise = multi_octave_noise(ft * 2., AMP_SCALE, FREQ_SCALE) * circle;
                    return circle > noise ? noise : circle;
                }
                
                float multi_octave_noise_wrapped_b(vec2 ft) {
                    return multi_octave_noise_b(ft * 2., AMP_SCALE, FREQ_SCALE);
                }
                
                float single_octave_noise_wrapped(vec2 pt) { 
                  return single_octave_noise(pt, AMP_SCALE, FREQ_SCALE);
                }
                `;
  }

  vertex_glsl_code() {
    // ********* VERTEX SHADER *********
    // language=Glsl
    return this.shared_glsl_code() + `
        varying vec2 f_tex_coord;
        varying float noisemap_val;
        attribute vec3 position, normal;
        // Position is expressed in object coordinates.
        attribute vec2 texture_coord;

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main() {
            #define OFFSET 0.002
            #define HEIGHT_SCALE 80.0
            noisemap_val = multi_octave_noise_wrapped(texture_coord);

            vertex_worldspace = (model_transform * vec4(position, 1.0)).xyz;
            // Bottom out the height for the oceans
            float height = noisemap_val * HEIGHT_SCALE;
            height = noisemap_val < 0.25 ? 0.25 * HEIGHT_SCALE : height;
            vertex_worldspace.y = height;

            vec3 next_vert_right = vec3(
                vertex_worldspace.x,
                multi_octave_noise_wrapped(texture_coord + vec2(0, OFFSET)),
                vertex_worldspace.z + OFFSET
            );
            vec3 next_vert_forward = vec3(
                vertex_worldspace.x + OFFSET,
                multi_octave_noise_wrapped(texture_coord + vec2(OFFSET, 0)),
                vertex_worldspace.z
            );
            vec3 next_vert_left = vec3(
                vertex_worldspace.x,
                multi_octave_noise_wrapped(texture_coord + vec2(0, -OFFSET)),
                vertex_worldspace.z - OFFSET
            );
            vec3 next_vert_down = vec3(
                vertex_worldspace.x - OFFSET,
                multi_octave_noise_wrapped(texture_coord + vec2(-OFFSET, 0)),
                vertex_worldspace.z
            );
            
            vec3 normal_tl = normalize(cross(next_vert_right - vertex_worldspace, next_vert_forward - vertex_worldspace));
            vec3 normal_tr = normalize(cross(next_vert_forward - vertex_worldspace, next_vert_left - vertex_worldspace));
            vec3 normal_bl = normalize(cross(next_vert_left - vertex_worldspace, next_vert_down - vertex_worldspace));
            vec3 normal_br = normalize(cross(next_vert_down - vertex_worldspace, next_vert_right - vertex_worldspace));
            
            vec3 normal = normalize(normal_tl + normal_tr + normal_bl + normal_br);

            N = normalize(mat3(model_transform) * normal / squared_scale);
            // Turn the per-vertex texture coordinate into an interpolated variable.
            f_tex_coord = texture_coord;
            // Interpolate the heightmap data
            gl_Position = projection_camera_model_transform * vec4(vertex_worldspace.xyz, 1.0);
        } `;
  }

  fragment_glsl_code() {
    // ********* FRAGMENT SHADER *********
    // A fragment is a pixel that's overlapped by the current triangle.
    // Fragments affect the final image or get discarded due to depth.
    // language=Glsl
    return this.shared_glsl_code() + `
        varying vec2 f_tex_coord;
        varying float noisemap_val;

        void main() {
            float fuzz = (multi_octave_noise_wrapped_b(f_tex_coord * 16.) - 0.5);

            float noise_val_rough = noisemap_val + fuzz * 0.15;
            float noise_val_fine = fuzz * 0.25;

            vec3 color;
//            gl_FragColor = vec4(color, 1);
//            gl_FragColor.xyz += phong_model_lights(normalize(N), vertex_worldspace, 1., 1.);
            //
            if (noise_val_rough > 0.55) {
                color = vec3(1., 1., 1.) * ((noise_val_fine * 0.2) + 0.8);

                gl_FragColor = vec4(color * ambient, 1);
                gl_FragColor.xyz += phong_model_lights(normalize(N), vertex_worldspace, 1., 1.);
            }
            else if (noise_val_rough > 0.3) {
                color = vec3(0., 0.6015625, 0.09019607843) * ((noise_val_fine * 0.6) + 0.4);
                
                gl_FragColor = vec4(color * ambient, 1);
                gl_FragColor.xyz += phong_model_lights(normalize(N), vertex_worldspace, 0.5, 0.1);
            }
            else {
                color = vec3(0.058823529411764705, 0.368627451, 0.8117647059) * ((noise_val_fine * 0.6) + 0.4);

                gl_FragColor = vec4(color * ambient * 4., 1);
                gl_FragColor.xyz += phong_model_lights(normalize(N), vertex_worldspace, 1., 1.) * 0.05;
            }

        } `;
  }

  update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
    // update_GPU(): Add a little more to the base class's version of this method.
    super.update_GPU(context, gpu_addresses, gpu_state, model_transform, material);
    // Updated for assignment 4
    context.uniform1f(gpu_addresses.animation_time, gpu_state.animation_time / 1000);
    if (material.texture && material.texture.ready) {
      // Select texture unit 0 for the fragment shader Sampler2D uniform called "texture":
      context.uniform1i(gpu_addresses.texture, 0);
      // For this draw, use the texture image from correct the GPU buffer:
      material.texture.activate(context);
    }
  }
}
