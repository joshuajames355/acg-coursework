
import { Scene, PerspectiveCamera, WebGLRenderer } from 'three';
import { perlin_noise, perlin_texture_plane } from "./generator"

const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(perlin_texture_plane());
camera.position.z = 1;

var frame_times: number[] = [];
var last_time = performance.now();
const NUM_FRAMES_ROLLING_AVERAGE = 5;

perlin_noise(2, 2);

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    var current_time = performance.now();
    var delta_time = current_time - last_time;

    if (frame_times.push(delta_time) > NUM_FRAMES_ROLLING_AVERAGE) frame_times.shift()
    var fps = (1000 * frame_times.length) / frame_times.reduce((a, b) => a + b);

    last_time = current_time;
}
animate();