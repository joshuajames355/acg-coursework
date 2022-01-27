import {
    Scene,
    WebGLRenderer,
    AmbientLight,
    DirectionalLight,
    DefaultLoadingManager,
    AxesHelper,
    Vector3,
    Fog,
    Color,
    MeshBasicMaterial,
} from "three";
import generate_city from "./city_gen";
import "./assets";
import { ThirdPersonCharacter } from "./character";
import { generate_skyscraper } from "./building";
import { skybox_tex } from "./assets";

const scene = new Scene();

scene.add(new DirectionalLight(0xffffff));
scene.add(new AmbientLight(0xffffff, 0.2));

const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var frame_times: number[] = [];
var last_time = performance.now();
const NUM_FRAMES_ROLLING_AVERAGE = 5;
var controller: ThirdPersonCharacter;

const axesHelper = new AxesHelper(5);
scene.add(axesHelper);

scene.fog = new Fog(new Color(0xffffff), 50, 8000);

DefaultLoadingManager.onLoad = function () {
    console.log("Loading complete!");
    generate_city(scene);

    controller = new ThirdPersonCharacter(renderer.domElement, scene);
    controller.object.translateY(-50);

    scene.background = skybox_tex;
};
DefaultLoadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    console.log("Loading file: " + url + ".\nLoaded " + itemsLoaded + " of " + itemsTotal + " files.");
};

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, controller.camera);

    var current_time = performance.now();
    var delta_time = current_time - last_time;

    controller.update(delta_time);

    if (frame_times.push(delta_time) > NUM_FRAMES_ROLLING_AVERAGE) frame_times.shift();
    var fps = (1000 * frame_times.length) / frame_times.reduce((a, b) => a + b);

    last_time = current_time;
}
animate();
