import { generate_terrain_parametric, perlin_noise_multiple_octaves } from "./generator";
import {
    Scene,
    Vector3,
    Vector2,
    MeshPhongMaterial,
    InstancedMesh,
    Matrix4,
    BoxGeometry,
    GreaterDepth,
    Euler,
    Mesh,
    MeshBasicMaterial,
} from "three";
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

//place roads into list of of edges (v1, v2).
//each road has a list of candidate roads:
//either with the same gradient, continuing to infinity, or perpindicular

//constants------------------------------------------------------------------------------------------------------------------
const WIDTH = 8192;
const HEIGHT = 8192;
const OFFSET = new Vector3(-50, -120, -50);

const NUM_CENTRES = 3;
const CENTRE_BOUNDS = 0.1; //city centers cannot be within this percentage of the edge
const MIN_DISTANCE_BETWEEN_CENTRES_SQR = 819200; //(100 ^ 2) / (GRID_RATIO ^ 2);

const DISTANCE_BETWEEN_ROADS = 2048;

export default function generate_city(scene: Scene) {
    //assets
    var road = road_model;
    road.material = new MeshPhongMaterial({ map: road_diffuse, normalMap: road_normal });
    road.scale.setScalar(0.4 * 16);

    var ROAD_LENGTH = 16.5 * 16;

    //step 1---------------------------------------------------------------------------------------------------------------------
    console.log("City Generation Step 1: Terrain Generation...");
    //var terrain: number[][] = generate_terrain(WIDTH, HEIGHT);

    //todo, correction pass

    //var terrain_mesh = terrain_to_mesh(terrain, OFFSET);
    //scene.add(terrain_mesh);
    var terrain_mesh = generate_terrain_parametric(WIDTH, HEIGHT, OFFSET);
    scene.add(terrain_mesh);
    //step 2---------------------------------------------------------------------------------------------------------------------
    console.log("City Generation Step 2: Placing Centre points...");
    var city_centres = [random_centre(), random_centre()];
    while (true) {
        var t = random_centre();
        if (
            city_centres[0].distanceToSquared(t) < MIN_DISTANCE_BETWEEN_CENTRES_SQR ||
            city_centres[1].distanceToSquared(t) < MIN_DISTANCE_BETWEEN_CENTRES_SQR
        )
            continue;

        var ab = t.clone().sub(city_centres[0]).normalize();
        var ac = t.clone().sub(city_centres[1]).normalize();
        if (ab.dot(ac) > 0.8) continue;
        city_centres.push(t);
        break;
    }

    console.log(city_centres);
    city_centres.forEach((x) => {
        var test = new BoxGeometry(1, 500, 1);
        var mesh = new Mesh(test, new MeshBasicMaterial());
        mesh.translateX(x.x);
        mesh.translateZ(x.y);
        scene.add(mesh);
    });

    //step 3---------------------------------------------------------------------------------------------------------------------
    console.log("City Generation Step 3: Placing Roads");

    var roads: Road[] = []; //always sorted such that end has a higher y value
    //first connect up city centres
    for (var x: number = 0; x < city_centres.length; x++) {
        var e1 = city_centres[x];
        for (var y: number = 0; y < city_centres.length; y++) {
            if (x != y) {
                var e2 = city_centres[y];
                var candidateRoad = new Road(e1.clone(), e2.clone());
                var extension = extendRoad(candidateRoad);
                if (isRoadUnique(roads, extension)) {
                    extension.type = RoadType.Highway;
                    roads.push(extension);
                }
            }
        }
    }
    //next, add roads Perpendicular to highways
    var new_roads: Road[] = [];
    for (var i: number = 0; i < roads.length; i++) {
        var grad = getGrad(roads[i]);
        var perp_grad = -1 / grad;

        //per unit distance
        var dx = Math.sqrt(1 / (1 + grad ** 2));
        var dy = Math.abs(dx * grad);
        if (roads[i].end.x < roads[i].start.x) dx = -Math.abs(dx);

        var x = roads[i].start.x;
        var y = roads[i].start.y;
        console.log(roads[i]);

        while (y < roads[i].end.y) {
            var road_test = roadFromPoint(new Vector2(x, y), perp_grad);
            //test if road makes sense
            if (testNewRoad(road_test, roads.concat(new_roads))) new_roads.push(road_test);

            x += dx * DISTANCE_BETWEEN_ROADS;
            y += dy * DISTANCE_BETWEEN_ROADS;
        }
    }

    roads = roads.concat(new_roads);

    var matrixs: Matrix4[] = [];
    roads.forEach((road: Road) => {
        var grad = getGrad(road);
        //var x =
        var yaw = getAngle(road);

        var length = road.type == RoadType.Highway ? ROAD_LENGTH * 2 : ROAD_LENGTH;
        var scale = road.type == RoadType.Highway ? 10 * 2 : 10;

        var x = road.start.x;
        var y = road.start.y;

        var dx = length * Math.sqrt(1 / (1 + grad ** 2));
        var dy = Math.abs(dx * grad);
        if (road.end.x < road.start.x) dx = -Math.abs(dx);

        while (y < road.end.y) {
            var pos = new Matrix4().makeTranslation(x + OFFSET.x, 50 + OFFSET.y, y + OFFSET.z);
            var rot = new Matrix4().makeRotationFromEuler(new Euler(0, -yaw, 0));
            var scale_mat = new Matrix4().makeScale(scale, scale, scale);
            matrixs.push(pos.multiply(rot).multiply(scale_mat));
            x += dx;
            y += dy;
        }
    });

    var roads_instanced = new InstancedMesh(road.geometry, road.material, matrixs.length);
    matrixs.forEach((x: Matrix4, i: number) => {
        roads_instanced.setMatrixAt(i, x);
    });
    scene.add(roads_instanced);

    //step 3---------------------------------------------------------------------------------------------------------------------
    console.log("City Generation Step 4: Placing Buildings");

    //finds empty spots
    var GAP_SIZE = 256;
    var blocks: number[][] = new Array(Math.round(HEIGHT / GAP_SIZE))
        .fill(0)
        .map(() => new Array(Math.round(WIDTH / GAP_SIZE)).fill(0));
    var index = 1;
    for (var x = GAP_SIZE; x < WIDTH; x += GAP_SIZE) {
        for (var y = GAP_SIZE; y < WIDTH; y += GAP_SIZE) {
            if (isPossibleBuildingSpot(roads, new Vector2(x, y))) {
                console.log("spot!");
                var geometry = new BoxGeometry(10, 10, 10);
                var mesh = new Mesh(geometry, new MeshBasicMaterial());
                mesh.position.copy(new Vector3(OFFSET.x + x, OFFSET.y + 50, OFFSET.z + y));
                scene.add(mesh);
                blocks[Math.round(x / GAP_SIZE)][Math.round(y / GAP_SIZE)] = index;
                index += 1;
            }
        }
    }
    console.log("joining blocks!");
    //joins them to form blocks
    for (var i = 0; i < 20; i++) {
        var madeSwap = false;
        for (var x: number = 0; x < WIDTH / GAP_SIZE; x++) {
            for (var y: number = 0; y < HEIGHT / GAP_SIZE; y++) {
                if (blocks[x][y] != 0) {
                    if (x != 0 && blocks[x - 1][y] != 0 && blocks[x - 1][y] != blocks[x][y]) {
                        blocks[x - 1][y] = blocks[x][y];
                        madeSwap = true;
                    }
                    if (y != 0 && blocks[x][y - 1] != 0 && blocks[x][y - 1] != blocks[x][y]) {
                        blocks[x][y - 1] = blocks[x][y];
                        madeSwap = true;
                    }
                    if (x < blocks.length - 1 && blocks[x + 1][y] != 0 && blocks[x + 1][y] != blocks[x][y]) {
                        blocks[x + 1][y] = blocks[x][y];
                        madeSwap = true;
                    }
                    if (y < blocks[x].length - 1 && blocks[x][y + 1] != 0 && blocks[x][y + 1] != blocks[x][y]) {
                        blocks[x][y + 1] = blocks[x][y];
                        madeSwap = true;
                    }
                }
            }
        }
        if (!madeSwap) break;
    }

    var blocks2: Block[] = [];
    for (var x: number = 0; x < WIDTH / GAP_SIZE; x++) {
        for (var y: number = 0; y < HEIGHT / GAP_SIZE; y++) {
            if (blocks[x][y] != 0) {
                var f = blocks2.find((k: Block) => k.id == blocks[x][y]);
                if (f == undefined) {
                    blocks2.push(new Block(blocks[x][y], new Vector2(x, y)));
                } else {
                    f.positons.push(new Vector2(x, y));
                }
            }
        }
    }

    blocks2.forEach((b: Block) => {
        if (b.positons.length > 4) {
            console.log("building!");
            var average = averageVector(b.positons).multiplyScalar(GAP_SIZE);
            var pos = new Vector3(average.x + OFFSET.x, 50 + OFFSET.y, average.y + OFFSET.z);

            var min_dist = city_centres.map((x: Vector2) => x.distanceTo(average)).sort()[0];
            //console.log(min_dist);

            generate_building(min_dist, 0, scene, pos);
        }
    });

    console.log("city generation finished");
}

class Block {
    positons: Vector2[] = [];
    id: number;
    constructor(id: number, pos: Vector2) {
        this.id = id;
        this.positons.push(pos);
    }
}

function random_centre() {
    return new Vector2(
        randInt(Math.floor(WIDTH * CENTRE_BOUNDS), Math.ceil(WIDTH * (1 - CENTRE_BOUNDS))),
        randInt(Math.floor(HEIGHT * CENTRE_BOUNDS), Math.ceil(HEIGHT * (1 - CENTRE_BOUNDS)))
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

enum RoadType {
    Highway,
    Street,
}

class Road {
    start: Vector2;
    end: Vector2;
    type: RoadType;
    constructor(start: Vector2, end: Vector2, type = RoadType.Street) {
        if (start.y > end.y) {
            this.start = end;
            this.end = start;
        } else {
            this.start = start;
            this.end = end;
        }
        this.type = type;
    }
}

function isRoadUnique(roads: Road[], road: Road, threshold: number = 1) {
    for (var x = 0; x < roads.length; x++) {
        if (
            roads[x].start.distanceToSquared(road.start) < threshold &&
            roads[x].end.distanceToSquared(road.end) < threshold
        ) {
            return false;
        }
    }
    return true;
}
function getGrad(road: Road) {
    return (road.end.y - road.start.y) / (road.end.x - road.start.x);
}

//extends line till x = WIDTH
function extendRoadForwards(road: Road) {
    var grad = getGrad(road);
    var xDist = WIDTH - road.end.x;
    var yDist = grad * xDist;
    return new Road(road.end, new Vector2(WIDTH, road.end.y + yDist));
}
//extends line till x = 0
function extendRoadBackwards(road: Road) {
    var grad = getGrad(road);
    var xDist = road.start.x;
    var yDist = grad * xDist;
    return new Road(new Vector2(0, road.start.y - yDist), road.start);
}

function extendRoad(road: Road) {
    var grad = getGrad(road);
    var result;
    if (grad > 0) {
        var start = new Vector2(0, road.start.y - grad * road.start.x); //extend road till x collides with 0
        if (start.y < 0) start = new Vector2(road.start.x - road.start.y / grad, 0);

        var end = new Vector2(WIDTH, road.end.y + grad * (WIDTH - road.end.x));
        if (end.y > HEIGHT) end = new Vector2(road.end.x + (HEIGHT - road.end.y) / grad, HEIGHT);
        result = new Road(start, end);
    } else {
        var grad = Math.abs(grad);
        var end = new Vector2(0, road.end.y + grad * road.end.x); //extend road till x collides with 0
        if (end.y > HEIGHT) end = new Vector2(road.end.x - (HEIGHT - road.end.y) / grad, 0);

        var start = new Vector2(WIDTH, road.start.y - grad * (WIDTH - road.start.x));
        if (start.y < 0) start = new Vector2(road.start.x + road.start.y / grad, 0);
        result = new Road(start, end);
    }
    return result;
}

//0 is horizontal, from left to right.
function getAngle(road: Road) {
    var grad = getGrad(road);
    if (grad > 0) {
        return Math.atan(grad);
    } else return Math.atan(grad);
}

//finds the first point on road1 that intersects with road2
function testIntersection(road1: Road, road2: Road): Vector2 | undefined {
    var m1 = getGrad(road1);
    var m2 = getGrad(road2);

    var y1 = road1.start.y;
    var y2 = road2.start.y;

    var x1 = road1.start.x;
    var x2 = road2.start.x;

    if (m1 == m2) return undefined;
    var x = (y2 - y1 + m1 * x1 - m2 * x2) / (m1 - m2);
    if (isXCoordInLine(road1, x) && isXCoordInLine(road2, x)) {
        var y = y1 + m1 * (x - x1);
        return new Vector2(x, y);
    }
    return undefined;
}

function getIntersection(road1: Road, road2: Road): Vector2 | undefined {
    var m1 = getGrad(road1);
    var m2 = getGrad(road2);

    var y1 = road1.start.y;
    var y2 = road2.start.y;

    var x1 = road1.start.x;
    var x2 = road2.start.x;

    if (m1 == m2) return undefined;
    var x = (y2 - y1 + m1 * x1 - m2 * x2) / (m1 - m2);
    if (isXCoordInLine(road1, x) && isXCoordInLine(road2, x)) {
        var y = y1 + m1 * (x - x1);
        return new Vector2(x, y);
    }
    return undefined;
}

function isXCoordInLine(road: Road, x: number) {
    if (road.start.x < road.end.x) {
        if (x > road.start.x && x < road.end.x) return true;
    } else {
        if (x > road.end.x && x < road.start.x) return true;
    }
    return false;
}

function roadFromPoint(point: Vector2, grad: number) {
    return extendRoad(new Road(point, point.clone().add(new Vector2(1, grad))));
}

function testNewRoad(newRoad: Road, roads: Road[]) {
    var angle1 = getAngle(newRoad);
    for (var x = 0; x < roads.length; x++) {
        var intersection = testIntersection(newRoad, roads[x]);
        if (intersection != undefined) {
            //Math.abs(angle1 - getAngle(roads[x])) < Math.PI / 4
            var count = 0;
            for (var y = 0; y < roads.length; y++) {
                if (x != y) {
                    if (circleCollision(roads[y], intersection, 1024)) count += 1;
                }
            }
            if (count > 1) return false;
        }
    }
    return true;
}

function circleCollision(road: Road, centre: Vector2, radius: number) {
    var ac = centre.clone().sub(road.start);
    var ab = road.end.clone().sub(road.start);
    var proj = ab.clone().multiplyScalar(ac.dot(ab) / ab.dot(ab));
    return ac.sub(proj).lengthSq() < radius ** 2;
}

function isPossibleBuildingSpot(roads: Road[], spot: Vector2) {
    var COLLISION_RADIUS = 256;
    for (var x: number = 0; x < roads.length; x++) {
        if (circleCollision(roads[x], spot, COLLISION_RADIUS)) return false;
    }
    return true;
}

function averageVector(vecs: Vector2[]) {
    var result = vecs[0].clone();
    for (var x: number = 1; x < vecs.length; x++) {
        result.add(vecs[x]);
    }
    return result.multiplyScalar(1 / vecs.length);
}
