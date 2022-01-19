import { Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight, DefaultLoadingManager } from "three";
import { FirstPersonControls } from "three/examples/jsm/controls/FirstPersonControls";
import generate_city from "./city_gen";
import "./assets";

const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const light = new DirectionalLight(0xffffff);
scene.add(light);

const light2 = new AmbientLight(0xffffff, 0.2);
scene.add(light2);

const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new FirstPersonControls(camera, renderer.domElement);
//controls.dragToLook = true;
controls.movementSpeed = 0.05;
controls.lookSpeed = 0.0005;

camera.position.z = 1;

var frame_times: number[] = [];
var last_time = performance.now();
const NUM_FRAMES_ROLLING_AVERAGE = 5;

DefaultLoadingManager.onLoad = function () {
    console.log("Loading complete!");
    generate_city(scene);
};
DefaultLoadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    console.log("Loading file: " + url + ".\nLoaded " + itemsLoaded + " of " + itemsTotal + " files.");
};

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    var current_time = performance.now();
    var delta_time = current_time - last_time;

    controls.update(delta_time);

    if (frame_times.push(delta_time) > NUM_FRAMES_ROLLING_AVERAGE) frame_times.shift();
    var fps = (1000 * frame_times.length) / frame_times.reduce((a, b) => a + b);

    last_time = current_time;
}
animate();
