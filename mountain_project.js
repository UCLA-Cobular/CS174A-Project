import {defs, tiny} from './examples/common.js';
import {Terrain} from "./terrain.js";

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const {Subdivision_Sphere, Cube, Axis_Arrows, Textured_Phong, Windmill, Phong_Shader} = defs

class Bird extends Shape {
    constructor() {
        super("position", "normal");
        // TODO (Requirement 6)
        this.arrays.position = Vector3.cast(
            [0, -1, -1], [0, -1, 1], [-1, 1, -1], [-1, 1, 1], [1, 1, -1], [1, 1, 1], [-2, 0, 0], [2, 0, 0]);

        this.arrays.normal = Vector3.cast(
            [0, -1, -1], [0, -1, 1], [-1, 1, -1], [-1, 1, 1], [1, 1, -1], [1, 1, 1], [-2, 0, 0], [2, 0, 0]);

        this.indices.push(6, 3, 2, 0, 1, 2, 2, 3, 1, 0, 1, 4, 4, 5, 1 , 4, 5, 7 );
    }
}

export class MountainProject extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // TODO:  Create two cubes, including one with the default texture coordinates (from 0 to 1), and one with the modified
        //        texture coordinates as required for cube #2.  You can either do this by modifying the cube code or by modifying
        //        a cube instance's texture_coords after it is already created.
        this.shapes = {
            box_1: new Terrain(500, 500),
            box_2: new Cube(),
            axis: new Axis_Arrows(),
            bird: new Bird(),
            sun: new Subdivision_Sphere(4)
        }

        // TODO:  Create the materials required to texture both cubes with the correct images and settings.
        //        Make each Material from the correct shader.  Phong_Shader will work initially, but when
        //        you get to requirements 6 and 7 you will need different ones.
        this.materials = {
            phong: new Material(new Phong_Shader(), {
                color: hex_color("#ffff00"),
                ambient: 0.0, diffusivity: 0.4, specularity: 0.1,

            }),
            sun: new Material(new Sun_Shader(), {
                color: hex_color("#ffff00"),
                ambient: 1, diffusivity: 0.4, specularity: 0.3,

            }),
            texture: new Material(new Textured_Phong(), {
                color: hex_color("#ffffff"),
                ambient: 0.0, diffusivity: 0.4, specularity: 0.2,
                texture: new Texture("assets/stars.png")
            }),
        }

        // this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 0, 1));
        this.initial_camera_location = Mat4.translation(0, -60, -50);

    }

    make_control_panel() {
        // TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
        this.key_triggered_button("View whole scene", ["Control", "0"], () => this.attached = () => this.initial_camera_location);
        this.key_triggered_button("View bird 1", ["Control", "1"], () => this.attached = () => this.bird_1);
    }

    draw_bird(context, program_state, model_transform)
    {
        const blue = hex_color("#1a9ffa");
        model_transform = model_transform.times(Mat4.rotation(this.t, 0, 1, 0)).times(Mat4.translation(10, 72, 0));
        this.shapes.bird.draw(context, program_state, model_transform, this.materials.phong.override({color:blue}), "TRIANGLE_STRIP");
        this.bird_1 = Mat4.inverse(model_transform.times(Mat4.rotation(-0.9, 1, 0, 0)).times(Mat4.translation(0, 0, 15)));
    }

    draw_sun(context, program_state, model_transform)
    {
        this.period = 20.0;
        let factor = 0.5 + 0.5*Math.sin(Math.PI*2*this.t/this.period);
        const sun_color = hex_color("#ff9a00")
        model_transform = Mat4.identity().times(Mat4.translation(0, 37.5, 0))
            .times(Mat4.rotation(Math.PI*2*(this.t)/this.period, 0, 0, 1))
            .times(Mat4.translation(40, 0, 0))
            .times(Mat4.scale(1.5, 1.5, 1.5));
        
        const light_position = vec4(100, 500, 200, 1);
        const sun_light = model_transform.times(vec4(1, 0, 0, 0))
        program_state.lights = [ new Light(light_position, color(1,1,1,1), 100000000),
            new Light(sun_light, sun_color, 10**20), ]

        const origin_loc = model_transform.times(vec4(0, 0, 0, 1))
        if (origin_loc[1] >37.5) 
        {
            this.shapes.sun.draw(context, program_state, model_transform, this.materials.sun.override({color: sun_color}));
        };
        
    }

    display(context, program_state) {
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);

            program_state.projection_transform = Mat4.perspective(
              Math.PI / 4, context.width / context.height, 1, 10000);
        }

        this.t = program_state.animation_time / 1000;
        this.dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();

        this.draw_sun(context, program_state, model_transform);

        this.shapes.box_1.draw(context, program_state, model_transform, this.materials.texture)

        this.draw_bird(context, program_state, model_transform);

        if (this.attached != undefined)
        {
            let desired = this.attached();
            program_state.camera_inverse = desired.map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1));
        }

    }
}


class Texture_Scroll_X extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                // Sample the texture image in the correct place:
                vec4 tex_color = texture2D( texture, f_tex_coord);
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}


class Texture_Rotate extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #7.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            void main(){
                // Sample the texture image in the correct place:
                vec4 tex_color = texture2D( texture, f_tex_coord );
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}

class Sun_Shader extends Shader {
        // **Phong_Shader** is a subclass of Shader, which stores and maanges a GPU program.
        // Graphic cards prior to year 2000 had shaders like this one hard-coded into them
        // instead of customizable shaders.  "Phong-Blinn" Shading here is a process of
        // determining brightness of pixels via vector math.  It compares the normal vector
        // at that pixel with the vectors toward the camera and light sources.


        constructor(num_lights = 2) {
            super();
            this.num_lights = num_lights - 1;
        }

        shared_glsl_code() {
            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
            return ` precision mediump float;
                const int N_LIGHTS = ` + this.num_lights + `;
                uniform float ambient, diffusivity, specularity, smoothness;
                uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
                uniform float light_attenuation_factors[N_LIGHTS];
                uniform vec4 shape_color;
                uniform vec3 squared_scale, camera_center;
        
                // Specifier "varying" means a variable's final value will be passed from the vertex shader
                // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
                // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
                varying vec3 N, vertex_worldspace;
                // ***** PHONG SHADING HAPPENS HERE: *****                                       
                vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
                    // phong_model_lights():  Add up the lights' contributions.
                    vec3 E = normalize( camera_center - vertex_worldspace );
                    vec3 result = vec3( 0.0 );
                    for(int i = 0; i < N_LIGHTS; i++){
                        // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                        // light will appear directional (uniform direction from all points), and we 
                        // simply obtain a vector towards the light by directly using the stored value.
                        // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                        // the point light's location from the current surface point.  In either case, 
                        // fade (attenuate) the light as the vector needed to reach it gets longer.  
                        vec3 surface_to_light_vector = light_positions_or_vectors[i+1].xyz - 
                                                       light_positions_or_vectors[i+1].w * vertex_worldspace;                                             
                        float distance_to_light = length( surface_to_light_vector );
        
                        vec3 L = normalize( surface_to_light_vector );
                        vec3 H = normalize( L + E );
                        // Compute the diffuse and specular components from the Phong
                        // Reflection Model, using Blinn's "halfway vector" method:
                        float diffuse  =      max( dot( N, L ), 0.0 );
                        float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                        float attenuation = 1.0 / (1.0 + light_attenuation_factors[i+1] * distance_to_light * distance_to_light );
                        
                        vec3 light_contribution = shape_color.xyz * light_colors[i+1].xyz * diffusivity * diffuse
                                                                  + light_colors[i+1].xyz * specularity * specular;
                        result += attenuation * light_contribution;
                      }
                    return result;
                  } `;
        }

        vertex_glsl_code() {
            // ********* VERTEX SHADER *********
            return this.shared_glsl_code() + `
                attribute vec3 position, normal;                            
                // Position is expressed in object coordinates.
                
                uniform mat4 model_transform;
                uniform mat4 projection_camera_model_transform;
        
                void main(){                                                                   
                    // The vertex's final resting place (in NDCS):
                    gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                    // The final normal vector in screen space.
                    N = normalize( mat3( model_transform ) * normal / squared_scale);
                    vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                  } `;
        }

        fragment_glsl_code() {
            // ********* FRAGMENT SHADER *********
            // A fragment is a pixel that's overlapped by the current triangle.
            // Fragments affect the final image or get discarded due to depth.
            return this.shared_glsl_code() + `
                void main(){                                                           
                    // Compute an initial (ambient) color:
                    gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                    // Compute the final color with contributions from lights:
                    gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
                  } `;
        }

        send_material(gl, gpu, material) {
            // send_material(): Send the desired shape-wide material qualities to the
            // graphics card, where they will tweak the Phong lighting formula.
            gl.uniform4fv(gpu.shape_color, material.color);
            gl.uniform1f(gpu.ambient, material.ambient);
            gl.uniform1f(gpu.diffusivity, material.diffusivity);
            gl.uniform1f(gpu.specularity, material.specularity);
            gl.uniform1f(gpu.smoothness, material.smoothness);
        }

        send_gpu_state(gl, gpu, gpu_state, model_transform) {
            // send_gpu_state():  Send the state of our whole drawing context to the GPU.
            const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
            gl.uniform3fv(gpu.camera_center, camera_center);
            // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
            const squared_scale = model_transform.reduce(
                (acc, r) => {
                    return acc.plus(vec4(...r).times_pairwise(r))
                }, vec4(0, 0, 0, 0)).to3();
            gl.uniform3fv(gpu.squared_scale, squared_scale);
            // Send the current matrices to the shader.  Go ahead and pre-compute
            // the products we'll need of the of the three special matrices and just
            // cache and send those.  They will be the same throughout this draw
            // call, and thus across each instance of the vertex shader.
            // Transpose them since the GPU expects matrices as column-major arrays.
            const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
            gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
            gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

            // Omitting lights will show only the material color, scaled by the ambient term:
            if (!gpu_state.lights.length)
                return;

            const light_positions_flattened = [], light_colors_flattened = [];
            for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
                light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
                light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
            }
            gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
            gl.uniform4fv(gpu.light_colors, light_colors_flattened);
            gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
        }

        update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
            // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
            // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
            // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
            // program (which we call the "Program_State").  Send both a material and a program state to the shaders
            // within this function, one data field at a time, to fully initialize the shader for a draw.

            // Fill in any missing fields in the Material object with custom defaults for this shader:
            const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
            material = Object.assign({}, defaults, material);

            this.send_material(context, gpu_addresses, material);
            this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
        }

}