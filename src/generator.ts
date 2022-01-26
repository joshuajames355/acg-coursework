import {
    Vector2,
    Color,
    DataTexture,
    RGBFormat,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    DoubleSide,
    Vector3,
    BoxGeometry,
    InstancedMesh,
    MeshPhongMaterial,
    Matrix4,
    BackSide,
    MirroredRepeatWrapping,
} from "three";

import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry.js";
import { grass_texture } from "./assets";

//This function applies a single octave of perlin noise
export function perlin_noise(x: number, y: number): number {
    //first defines vectors for each point in the surrounding cube
    var lower_x = Math.floor(x);
    var lower_y = Math.floor(y);

    var vectors = [
        new Vector2(lower_x, lower_y),
        new Vector2(lower_x, lower_y + 1),
        new Vector2(lower_x + 1, lower_y),
        new Vector2(lower_x + 1, lower_y + 1),
    ];

    var current_vector = new Vector2(x, y);

    var difference = vectors[0].clone().sub(current_vector);
    var a1 = difference.dot(generate_gradient_vector(vectors[0].x, vectors[0].y));

    var difference = vectors[1].clone().sub(current_vector);
    var a2 = difference.dot(generate_gradient_vector(vectors[1].x, vectors[1].y));

    var difference = vectors[2].clone().sub(current_vector);
    var a3 = difference.dot(generate_gradient_vector(vectors[2].x, vectors[2].y));

    var difference = vectors[3].clone().sub(current_vector);
    var a4 = difference.dot(generate_gradient_vector(vectors[3].x, vectors[3].y));

    var pair1 = interpolate(a1, a2, fade(y - lower_y));
    var pair2 = interpolate(a3, a4, fade(y - lower_y));
    return interpolate(pair1, pair2, fade(x - lower_x));
}

function generate_gradient_vector(x: number, y: number): Vector2 {
    var vectors_temp = [
        [-1, 1],
        [1, 1],
        [-1, -1],
        [1, -1],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ];

    return new Vector2().fromArray(vectors_temp[hash((x + 20) * ((y + 1) << 3)) % 8]); //an arbritary combination of x y and z
}

//generates a random number given a seed
//expects seed to be a 32bit signed integer, ie < 0x7FFFFFFF
function hash(x: number) {
    x = (((x >> 16) ^ x) * 0x45d9f3b) % 0x7fffffff;
    x = (((x >> 16) ^ x) * 0x45d9f3b) % 0x7fffffff;
    return (x >> 16) ^ x % 0x7fffffff;
}

export function perlin_noise_multiple_octaves(x: number, y: number, num_octaves: number = 4, falloff: number = 0.5) {
    var result: number = 0;
    for (var num = 0; num < num_octaves; num++) {
        var ratio = 2 ** num;
        result += perlin_noise(x * ratio, y * ratio) * falloff ** num;
    }
    return result;
}

var interpolate = (a: number, b: number, weight: number) => (b - a) * weight + a; //interpolates from a to b
var fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10); // 6t^5 - 15t^4 + 10t^3

//based off https://threejs.org/docs/#api/en/textures/DataTexture example
function generate_perlin_texture() {
    // create a buffer with color data

    const width = 512;
    const height = 512;

    const size = width * height;
    const data = new Uint8Array(3 * size);

    for (let i = 0; i < size; i++) {
        const stride = i * 3;
        var x = i % width;
        var y = Math.floor(i / width);

        var colour = (perlin_noise_multiple_octaves(x / 64, y / 64) * 0.5 + 1) * 150;
        //console.log(colour);

        data[stride] = colour;
        data[stride + 1] = colour;
        data[stride + 2] = colour;
    }

    // used the buffer to create a DataTexture

    return new DataTexture(data, width, height, RGBFormat);
}

// creates a plane textured with a perlin texture,
// used for debugging
export function perlin_texture_plane() {
    const geometry = new PlaneGeometry(1, 1);
    const material = new MeshBasicMaterial({
        map: generate_perlin_texture(),
        side: DoubleSide,
    });

    return new Mesh(geometry, material);
}

export function generate_terrain(width: number, height: number, offset: Vector3 = new Vector3(0, 0, 0)) {
    var mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshPhongMaterial({ color: 0x348c31 }), width * height);
    for (let i = 0; i < width * height; i++) {
        var x = (i % width) + offset.x;
        var y = Math.floor(i / width) + offset.z;
        var z = (perlin_noise_multiple_octaves(x / 256, y / 256, 4, 0.3) * 0.5 + 1) * 40 + offset.y;

        var matrix = new Matrix4().makeTranslation(x, z, y);
        mesh.setMatrixAt(i, matrix);
    }
    return mesh;
}

export function perlin_noise_actual() {
    //return (perlin_noise_multiple_octaves(u * 4, v * 4, 4, 0.3) * 0.5 + 1) * 120 - 60;
}

export function generate_terrain_parametric(width: number, height: number, offset: Vector3 = new Vector3(0, 0, 0)) {
    var geometry = new ParametricGeometry(
        (u: number, v: number, y: Vector3) => {
            y.x = u * width;
            y.y = (perlin_noise_multiple_octaves(u * 4, v * 4, 4, 0.3) * 0.5 + 1) * 40;
            y.z = v * height;
        },
        128,
        128
    );
    grass_texture.repeat.setX(width / 32);
    grass_texture.repeat.setY(height / 32);
    grass_texture.wrapS = MirroredRepeatWrapping;
    grass_texture.wrapT = MirroredRepeatWrapping;
    var mat = new MeshPhongMaterial({ map: grass_texture });
    mat.side = BackSide;
    var mesh = new Mesh(geometry, mat);
    mesh.translateX(offset.x);
    mesh.translateY(offset.y);
    mesh.translateZ(offset.z);
    return mesh;
}
