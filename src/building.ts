//generates a random building based on some parameters and adds to the scene

import { BoxGeometry, Mesh, MeshBasicMaterial, MeshPhongMaterial, Object3D, Scene, Vector3 } from "three";
import { randFloat } from "three/src/math/MathUtils";
import { house_diffuse, house_model, skyscraper1_model, skyscraper1_tex } from "./assets";

export function generate_building(distance_to_centre: number, zoning: number, scene: Scene, pos: Vector3) {
    var height = 25 * Math.exp(-(distance_to_centre + randFloat(0, 50)) / 2048);
    console.log(height);

    if (height < 4) {
        scene.add(generate_house(pos));
    } else {
        scene.add(generate_skyscraper(height, pos));
    }
}

export function generate_skyscraper(height: number, pos: Vector3): Object3D {
    const FLOOR_HEIGHT = 400;
    var obj = new Object3D();
    for (var y = 0; y < height; y++) {
        const material = new MeshPhongMaterial({ map: skyscraper1_tex });
        const mesh = skyscraper1_model.clone();
        mesh.material = material;

        mesh.scale.setScalar(200);
        mesh.translateX(pos.x);
        mesh.translateY(pos.y + y * FLOOR_HEIGHT);
        mesh.translateZ(pos.z);
        obj.add(mesh);
    }
    return obj;
}

function generate_house(pos: Vector3) {
    var mesh = house_model.clone(); //low density residential
    const material = new MeshPhongMaterial();
    material.specular.setScalar(0);
    material.map = house_diffuse;
    mesh.material = material;
    mesh.scale.setScalar(20);
    mesh.position.setX(pos.x + 15);
    mesh.position.setY(pos.y);
    mesh.position.setZ(pos.z - 10);
    mesh.frustumCulled = false;
    return mesh;
}
