import { perlin_noise_multiple_octaves } from "./generator";
import { Scene, Vector3, Vector2, MeshPhongMaterial, InstancedMesh, Matrix4, BoxGeometry, GreaterDepth } from "three";
import { randInt } from "three/src/math/MathUtils";
import { road_diffuse, road_model, road_normal } from "./assets";
import { generate_building } from "./building";

//step 1.
//generate terrain in fixed bounds via perlin noise
//do a correction pass. maybe do erosion simulation, + add rivers etc.

//step 2.
//place (multiple?) city center(s) randomly.

//step 3.
//connect city centres
//place roads propogating outwards from center in a grid
//correct previous pass, swap roads for bridges as needed, remove dead ends/too high of a gradient.

//step 4.
//split leftover gaps into blocks, allocate each block a zoning rule + density value (fn(distance to center) + perlin_noise)
//place buildings inside blocks based on zoning and density rules

//notes
//bottom left is (0,0), top right is (width, height)

//constants------------------------------------------------------------------------------------------------------------------
const WIDTH = 1024;
const HEIGHT = 1024;
const OFFSET = new Vector3(-50, -50, -50);

const GRID_RATIO = 8; //ratio of terrain grid to "blocks" grid

const NUM_CENTRES = 3;
const CENTRE_BOUNDS = 0.1; //city centers cannot be within this percentage of the edge
const MIN_DISTANCE_BETWEEN_CENTRES_SQR = 512; //(100 ^ 2) / (GRID_RATIO ^ 2);

const DISTANCE_BETWEEN_ROADS = 5;

export default function generate_city(scene: Scene) {
    //assets
    var road = road_model;
    road.material = new MeshPhongMaterial({ map: road_diffuse, normalMap: road_normal });
    road.scale.setScalar(0.04 * GRID_RATIO);

    //step 1---------------------------------------------------------------------------------------------------------------------
    console.log("City Generation Step 1: Terrain Generation...");
    var terrain: number[][] = generate_terrain(WIDTH, HEIGHT);

    //todo, correction pass

    var terrain_mesh = terrain_to_mesh(terrain, OFFSET);
    scene.add(terrain_mesh);
    //step 2---------------------------------------------------------------------------------------------------------------------
    console.log("City Generation Step 2: Placing Centre points...");
    var city_centres = [random_centre()];
    for (var x = 1; x < NUM_CENTRES; x++) {
        var candidate = random_centre();

        //generates new candidates until minimun distance metric is met
        while (
            city_centres
                .map((y: Vector2) => y.distanceToSquared(candidate) < MIN_DISTANCE_BETWEEN_CENTRES_SQR)
                .reduce((a: boolean, b: boolean) => a && b)
        ) {
            var candidate = random_centre();
        }
        city_centres.push(candidate);
    }

    //step 3---------------------------------------------------------------------------------------------------------------------
    console.log("City Generation Step 3: Placing Roads");
    //all roads alligned with axis for now.
    var blocks: number[][] = new Array(HEIGHT / GRID_RATIO).fill(0).map(() => new Array(WIDTH / GRID_RATIO).fill(0));

    /*

    //place some random conections between city centres
    var current = city_centres[randInt(0, city_centres.length - 1)];
    var loc_x = current.x;
    var loc_y = current.y;

    console.log(city_centres);

    blocks[loc_x][loc_y] = 1;

    var count = Math.round(NUM_CENTRES * 2);

    for (var i = 0; i < count; i++) {
        var next = city_centres[randInt(0, city_centres.length - 1)];
        while (loc_x != next.x) {
            loc_x = loc_x < next.x ? loc_x + 1 : loc_x - 1;
            blocks[loc_x][loc_y] = 1;
        }
        while (loc_y != next.y) {
            loc_y = loc_y < next.y ? loc_y + 1 : loc_y - 1;
            blocks[loc_x][loc_y] = 1;
        }
    }

    //add a few more

    var blocks2 = Object.assign(blocks);

    var initial_x = loc_x;
    var initial_y = loc_y;

    */
    /*

    for (var i = 0; i < 128; i++) {
        if (loc_x != 0 && blocks[loc_x - 1][loc_y] == 1) {
            //road going left
            if (last_road > DISTANCE_BETWEEN_ROADS) {
                last_road = 0;
                var y = loc_y;
                while (y > 0) {
                    y--;
                    blocks2[loc_x][y] = 1;
                }
                var y = loc_y;
                while (y < HEIGHT / GRID_RATIO) {
                    y++;
                    blocks2[loc_x][y] = 1;
                }
            } else {
                last_road += 1;
            }
            loc_x -= 1;
        } else if (loc_y != 0 && blocks[loc_x][loc_y - 1] == 1) {
            //road going down
            if (last_road > DISTANCE_BETWEEN_ROADS) {
                last_road = 0;
                var x = loc_x;
                while (x > 0) {
                    x--;
                    blocks2[x][loc_y] = 1;
                }
                var x = loc_y;
                while (x < WIDTH / GRID_RATIO) {
                    x++;
                    blocks2[x][loc_y] = 1;
                }
            } else {
                last_road += 1;
            }
            loc_y -= 1;
        } else if (loc_x == initial_x && loc_y == initial_y) {
            break;
        } else {
            console.log("stuck!");
        }
    } */

    var last_road = 1; //inf

    for (var x = 0; x < WIDTH / GRID_RATIO; x++) {
        var count = 0;
        for (var y = 0; y < HEIGHT / GRID_RATIO; y++) {
            if (blocks[x][y] == 1) count++;
        }
        if (count > HEIGHT / GRID_RATIO / 32) {
            //ie not a major road
            last_road = 0;
            //console.log("road!");
        } else {
            //console.log("not a road!");
            if (last_road > DISTANCE_BETWEEN_ROADS) {
                for (var y = 0; y < HEIGHT / GRID_RATIO; y++) {
                    blocks[x][y] = 1;
                }
                last_road = 0;
            } else {
                last_road += 1;
            }
        }
    }
    for (var y = 0; y < HEIGHT / GRID_RATIO; y++) {
        var count = 0;
        for (var x = 0; x < WIDTH / GRID_RATIO; x++) {
            if (blocks[x][y] == 1) count++;
        }
        if (count > WIDTH / GRID_RATIO / DISTANCE_BETWEEN_ROADS) {
            //ie not a major road
            last_road = 0;
        } else {
            //console.log("not a road!");
            if (last_road > DISTANCE_BETWEEN_ROADS) {
                for (var x = 0; x < WIDTH / GRID_RATIO; x++) {
                    blocks[x][y] = 1;
                }
                last_road = 0;
            } else {
                last_road += 1;
            }
        }
    }

    //add roads to scene
    for (var x = 1; x < WIDTH / GRID_RATIO - 1; x++) {
        for (var y = 1; y < HEIGHT / GRID_RATIO - 1; y++) {
            if (blocks[x][y] == 1) {
                //todo, check adjacent squares.
                var mesh_tmp = road.clone();
                mesh_tmp.translateX(x * GRID_RATIO + OFFSET.x);
                mesh_tmp.translateZ(y * GRID_RATIO + OFFSET.z);
                mesh_tmp.translateY(terrain[x * GRID_RATIO][y * GRID_RATIO] + OFFSET.y + 2);
                scene.add(mesh_tmp);
            }
        }
    }
    //step 3---------------------------------------------------------------------------------------------------------------------
    console.log("City Generation Step 4: Placing Buildings");

    for (var x = 1; x < WIDTH / GRID_RATIO - 1; x++) {
        for (var y = 1; y < HEIGHT / GRID_RATIO - 1; y++) {
            if (blocks[x][y] == 0) {
                //find upper and lower bounds of block
                for (var upperX = x; upperX < WIDTH / GRID_RATIO - 1; upperX++) {
                    if (blocks[upperX + 1][y] != 0) {
                        break;
                    }
                }
                for (var upperY = y; upperY < HEIGHT / GRID_RATIO - 1; upperY++) {
                    if (blocks[x][upperY] != 0) {
                        break;
                    }
                }
                for (var lowerX = x; lowerX > 1; lowerX--) {
                    if (blocks[lowerX - 1][y] != 0) {
                        break;
                    }
                }
                for (var lowerY = y; lowerY > 1; lowerY--) {
                    if (blocks[x][lowerY - 1] != 0) {
                        break;
                    }
                }

                //mark blocks as taken
                for (var x2 = lowerX; x2 <= upperX; x2++) {
                    for (var y2 = lowerY; y2 <= upperY; y2++) {
                        blocks[x2][y2] = 2;
                    }
                }

                var gridPos = new Vector2((upperX + lowerX) / 2, (upperY + lowerY) / 2);

                var pos = new Vector3(
                    GRID_RATIO * gridPos.x + OFFSET.x,
                    terrain[Math.round(gridPos.x) * GRID_RATIO][Math.round(gridPos.y) * GRID_RATIO] + OFFSET.y + 2,
                    GRID_RATIO * gridPos.y + OFFSET.z
                );

                var min_dist = city_centres.map((x: Vector2) => x.distanceTo(gridPos)).sort()[0];
                //console.log(min_dist);

                generate_building(min_dist, 0, scene, pos);
            }
        }
    }
}

function random_centre() {
    return new Vector2(
        randInt(
            Math.floor((WIDTH * CENTRE_BOUNDS) / GRID_RATIO),
            Math.ceil((WIDTH * (1 - CENTRE_BOUNDS)) / GRID_RATIO)
        ),
        randInt(
            Math.floor((HEIGHT * CENTRE_BOUNDS) / GRID_RATIO),
            Math.ceil((HEIGHT * (1 - CENTRE_BOUNDS)) / GRID_RATIO)
        )
    );
}

export function terrain_to_mesh(terrain: number[][], offset: Vector3) {
    var mesh = new InstancedMesh(
        new BoxGeometry(1, 1, 1),
        new MeshPhongMaterial({ color: 0x348c31 }),
        terrain.length * terrain[0].length
    );
    for (let x = 0; x < terrain.length; x++) {
        for (let y = 0; y < terrain[x].length; y++) {
            var matrix = new Matrix4().makeTranslation(x + offset.x, terrain[x][y] + offset.y, y + offset.z);
            mesh.setMatrixAt(x * terrain[0].length + y, matrix);
        }
    }
    return mesh;
}

function generate_terrain(width: number, height: number) {
    var result: number[][] = new Array(height).fill(0).map(() => new Array(width).fill(0));
    for (let i = 0; i < width * height; i++) {
        var x = i % width;
        var y = Math.floor(i / width);
        var z = (perlin_noise_multiple_octaves(x / 256, y / 256, 4, 0.3) * 0.5 + 1) * 40;

        result[x][y] = z;
    }
    return result;
}
