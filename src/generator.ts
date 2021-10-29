import { Vector2, Color, DataTexture, RGBFormat } from 'three';

//This function applies a single octave of perlin noise
export function perlin_noise(x: number, y: number): number {
    //first defines vectors for each point in the surrounding cube
    var lower_x = Math.floor(x);
    var lower_y = Math.floor(y);

    var vectors = [
        new Vector2(lower_x, lower_y),
        new Vector2(lower_x, lower_y + 1),
        new Vector2(lower_x + 1, lower_y),
        new Vector2(lower_x + 1, lower_y + 1)
    ]

    //console.log("start perlin")
    //console.log(lower_x)
    //console.log(vectors[1])
    //console.log(vectors[1].x)

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
    return interpolate(pair1, pair2, fade(x - lower_x))
}

function generate_gradient_vector(x: number, y: number): Vector2 {
    var vectors_temp = [[-1, 1], [1, 1], [-1, -1], [1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];

    //console.log("start")
    //console.log("!!x: " + x.toString() + " y: " + y.toString())
    //console.log((x + 20) * ((y + 1) << 3))
    //console.log(hash((x + 20) * ((y + 1) << 3)));

    return new Vector2().fromArray(vectors_temp[hash((x + 20) * ((y + 1) << 3)) % 8]); //an arbritary combination of x y and z
}

//generates a random number given a seed
//expects seed to be a signed integer < 0x7FFFFFFF
function hash(x: number) {
    x = ((x >> 16) ^ x) * 0x45d9f3b % 0x7FFFFFFF;
    x = ((x >> 16) ^ x) * 0x45d9f3b % 0x7FFFFFFF;
    return (x >> 16) ^ x % 0x7FFFFFFF;
}


var interpolate = (a: number, b: number, weight: number) => (b - a) * weight + a; //interpolates from a to b
var fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);  // 6t^5 - 15t^4 + 10t^3

//based off https://threejs.org/docs/#api/en/textures/DataTexture example
export function generate_perlin_texture() {
    // create a buffer with color data

    const width = 512;
    const height = 512;

    const size = width * height;
    const data = new Uint8Array(3 * size);
    const color = new Color(0xffffff);

    for (let i = 0; i < size; i++) {

        const stride = i * 3;
        var x = i % width;
        var y = Math.floor(i / width);

        var colour = ((perlin_noise(x / 16.0, y / 16.0) + perlin_noise(x / 4.0, y / 4.0) * 0) * 0.5 + 1) * 255;

        data[stride] = colour;
        data[stride + 1] = colour;
        data[stride + 2] = colour;

    }

    // used the buffer to create a DataTexture

    return new DataTexture(data, width, height, RGBFormat);
}
