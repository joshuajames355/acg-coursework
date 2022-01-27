import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BVH, BVHLoader } from "three/examples/jsm/loaders/BVHLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { CubeTextureLoader, TextureLoader, Mesh, Texture, SkinnedMesh, Scene, Group, CubeTexture } from "three";

//loads all assets and writes them to global vars

const gltf_loader = new GLTFLoader();
const tex_loader = new TextureLoader();
const bvh_loader = new BVHLoader();
const fbx_loader = new FBXLoader();
const cube_loader = new CubeTextureLoader();

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
export var character_scene: GLTF;

gltf_loader.load("/art/character2/character.glb", function (gltf) {
    //character_model = gltf.scene.children[0] as SkinnedMesh;
    character_scene = gltf;
    console.log(gltf);
});
/*fbx_loader.load("art/character2/character.fbx", function (fbx) {
    //character_model = fbx.children[0] as SkinnedMesh;
    character_scene = fbx;
});*/
export var character_run_anim: BVH;
bvh_loader.load("/art/character2/09_02.bvh", function (bvh) {
    character_run_anim = bvh;
});
export var character_walk_anim: BVH;
bvh_loader.load("/art/character2/07_01.bvh", function (bvh) {
    character_walk_anim = bvh;
});
export var character_jump_anim: BVH;
bvh_loader.load("/art/character2/02_04.bvh", function (bvh) {
    character_jump_anim = bvh;
});
export var character_idle1_anim: BVH;
bvh_loader.load("/art/character2/02_05.bvh", function (bvh) {
    character_idle1_anim = bvh;
});

export var character_idle2_anim: BVH;
bvh_loader.load("/art/character2/02_06.bvh", function (bvh) {
    character_idle2_anim = bvh;
});

export var grass_texture: Texture;
tex_loader.load("/art/grass.jpg", function (tex) {
    tex.flipY = false;
    grass_texture = tex;
});

export var skyscraper1_model: Mesh;
export var skyscraper1_tex: Texture;
gltf_loader.load("/art/skyscraper1/skyscraper.glb", function (gltf) {
    skyscraper1_model = gltf.scene.children[0] as Mesh;
});
tex_loader.load("/art/skyscraper1/diffuse.png", function (tex) {
    tex.flipY = false;
    skyscraper1_tex = tex;
});

//https://opengameart.org/content/cloudy-skyboxes
export var skybox_tex: CubeTexture;
cube_loader.load(
    [
        "/art/skybox/bluecloud_ft.jpg",
        "/art/skybox/bluecloud_bk.jpg",
        "/art/skybox/bluecloud_up.jpg",
        "/art/skybox/bluecloud_dn.jpg",
        "/art/skybox/bluecloud_rt.jpg",
        "/art/skybox/bluecloud_lf.jpg",
    ],

    function (cube) {
        skybox_tex = cube;
    }
);
