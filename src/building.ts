//generates a random building based on some parameters and adds to the scene

import { BoxGeometry, Mesh, MeshBasicMaterial, Object3D, Scene, Vector3 } from "three";
import { randFloat } from "three/src/math/MathUtils";
import generate_city from "./city_gen";

export function generate_building(distance_to_centre: number, zoning: number, scene: Scene, pos: Vector3) {
    var height = 50 * Math.exp(-(distance_to_centre + randFloat(0, 50)) / 25);

    if (height < 4) {
        scene.add(generate_house(pos));
    } else {
        scene.add(generate_skyscraper(height, pos));
    }
}

function generate_skyscraper(height: number, pos: Vector3): Object3D {
    var obj = new Object3D();
    for (var y = 0; y < height; y++) {
        var box = new BoxGeometry(1, 1, 1); //low density residential
        const material = new MeshBasicMaterial();
        const mesh = new Mesh(box, material);
        mesh.translateX(pos.x);
        mesh.translateY(pos.y + y);
        mesh.translateZ(pos.z);
        obj.add(mesh);
    }
    return obj;
}

function generate_house(pos: Vector3) {
    var box = new BoxGeometry(1, 2, 1); //low density residential
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(box, material);
    mesh.translateX(pos.x);
    mesh.translateY(pos.y);
    mesh.translateZ(pos.z);
    return mesh;
}
