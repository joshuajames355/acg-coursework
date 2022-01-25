import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TextureLoader, Mesh, Texture } from "three";

//loads all assets and writes them to global vars

const gltf_loader = new GLTFLoader();
const tex_loader = new TextureLoader();

export var road_model: Mesh;
export var road_diffuse: Texture;
export var road_normal: Texture;

gltf_loader.load("/art/road/road.glb", function (gltf) {
    road_model = gltf.scene.children[0] as Mesh;
});
tex_loader.load("/art/road/diffuse.png", function (tex) {
    tex.flipY = false;
    road_diffuse = tex;
});
tex_loader.load("/art/road/normal.png", function (normal_teture) {
    normal_teture.flipY = false;
    road_normal = normal_teture;
});

export var house_model: Mesh;
export var house_diffuse: Texture;
gltf_loader.load("/art/house/house.glb", function (gltf) {
    house_model = gltf.scene.children[0] as Mesh;
});
tex_loader.load("/art/house/diffus.png", function (tex) {
    tex.flipY = false;
    house_diffuse = tex;
});
