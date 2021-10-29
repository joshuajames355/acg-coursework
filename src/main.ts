
import { Scene, PerspectiveCamera, WebGLRenderer, PlaneGeometry, MeshBasicMaterial, Mesh, DoubleSide } from 'three';
import { perlin_noise, generate_perlin_texture } from "./generator"

const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new PlaneGeometry(1, 1);
const material = new MeshBasicMaterial({ map: generate_perlin_texture(), side: DoubleSide });
//const material = new MeshBasicMaterial({ color: 0xffff00, side: DoubleSide });
const plane = new Mesh(geometry, material);
scene.add(plane);
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