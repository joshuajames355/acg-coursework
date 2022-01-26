import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BVH, BVHLoader } from "three/examples/jsm/loaders/BVHLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { TextureLoader, Mesh, Texture, SkinnedMesh, Scene, Group } from "three";

//loads all assets and writes them to global vars

const gltf_loader = new GLTFLoader();
const tex_loader = new TextureLoader();
const bvh_loader = new BVHLoader();
const fbx_loader = new FBXLoader();

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
export var character_model: SkinnedMesh;
export var character_scene: Group;
gltf_loader.load("/art/character/character.glb", function (gltf) {
    character_model = gltf.scene.children[0] as SkinnedMesh;
    character_scene = gltf.scene;
    console.log(gltf);
}); /*
fbx_loader.load("/art/character/character.fbx", function (fbx) {
    character_model = fbx.children[0] as SkinnedMesh;
    character_scene = fbx;
});*/
export var character_run_anim: BVH;
bvh_loader.load("/art/character/07_01.bvh", function (bvh) {
    character_run_anim = bvh;
});
export var grass_texture: Texture;
tex_loader.load("/art/grass.jpg", function (tex) {
    tex.flipY = false;
    grass_texture = tex;
});
