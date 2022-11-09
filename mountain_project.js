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
            texture: new Material(new Textured_Phong(), {
                color: hex_color("#ffffff"),
                ambient: 0.0, diffusivity: 0.4, specularity: 0.2,
                texture: new Texture("assets/stars.png")
            }),
        }

        // this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 0, 1));
        this.initial_camera_location = Mat4.translation(0, -10, -30);

    }

    make_control_panel() {
        // TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
        this.key_triggered_button("View whole scene", ["Control", "0"], () => this.attached = () => this.initial_camera_location);
        this.key_triggered_button("View bird 1", ["Control", "1"], () => this.attached = () => this.bird_1);
    }

    draw_bird(context, program_state, model_transform)
    {
        this.t = program_state.animation_time / 1000
        this.dt = program_state.animation_delta_time / 1000;
        const blue = hex_color("#1a9ffa");
        model_transform = model_transform.times(Mat4.rotation(this.t, 0, 1, 0)).times(Mat4.translation(10, 12, 0));
        this.shapes.bird.draw(context, program_state, model_transform, this.materials.phong.override({color:blue}), "TRIANGLE_STRIP");
        this.bird_1 = Mat4.inverse(model_transform.times(Mat4.rotation(-0.9, 1, 0, 0)).times(Mat4.translation(0, 0, 15)));
    }

    draw_sun(context, program_state, model_transform)
    {
        model_transform = Mat4.identity().times(Mat4.translation(0, 17.5, 0)).times(Mat4.scale(1.5, 1.5, 1.5))
        this.shapes.sun.draw(context, program_state, model_transform, this.materials.phong);
    }

    

    display(context, program_state) {
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);

            program_state.projection_transform = Mat4.perspective(
              Math.PI / 4, context.width / context.height, 1, 10000);
        }

        const light_position = vec4(100, 500, 200, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 100000000)];

        let t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();

        this.shapes.box_1.draw(context, program_state, model_transform, this.materials.texture)

        this.draw_bird(context, program_state, model_transform);

        this.draw_sun(context, program_state, model_transform);

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

