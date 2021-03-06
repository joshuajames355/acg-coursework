import {
    WebGLRenderer,
    PerspectiveCamera,
    Camera,
    Euler,
    EventDispatcher,
    Vector3,
    Object3D,
    Group,
    SkinnedMesh,
    Scene,
    Spherical,
    AnimationMixer,
    AnimationObjectGroup,
    LoopOnce,
    LoopRepeat,
    Skeleton,
    Bone,
    MeshBasicMaterial,
    SkeletonHelper,
    AnimationClip,
    AnimationAction,
    Quaternion,
} from "three";
import { lerp } from "three/src/math/MathUtils";
import {
    character_idle1_anim,
    character_idle2_anim,
    character_jump_anim,
    character_run_anim,
    character_scene,
    character_walk_anim,
} from "./assets";

// @ts-ignore
import { retargetBVH } from "./retarget.js";

const _vector = new Vector3();

const _PI_2 = Math.PI / 2;
const _speed = 0.25;

enum AnimState {
    Idle,
    Walking,
    Running,
}

enum MovementState {
    Idle,
    Forward,
    Back,
    Left,
    Right,
}

//based on https://github.com/mrdoob/three.js/blob/master/examples/jsm/controls/PointerLockControls.js
export class ThirdPersonCharacter extends EventDispatcher {
    domElement: HTMLElement;
    isLocked: boolean;

    minPolarAngle: number;
    maxPolarAngle: number;

    connect: () => void;
    disconnect: () => void;
    dispose: () => void;
    getObject: () => Object3D;
    lock: () => void;
    unlock: () => void;
    moveRight: (x: number) => void;
    moveForward: (x: number) => void;
    getDirection: (v: Vector3) => Vector3;

    model: Object3D;
    camera: Camera;

    movementState: MovementState = MovementState.Idle;
    object: Object3D;
    focus: Vector3;

    mixer: AnimationMixer;

    isSprinting: boolean;

    run: AnimationAction;
    walk: AnimationAction;
    jump: AnimationAction;

    animState: AnimState;
    lastAction: AnimationAction;

    constructor(domElement: HTMLElement, scene: Scene) {
        super();
        if (domElement === undefined) {
            console.warn('THREE.PointerLockControls: The second parameter "domElement" is now mandatory.');
            domElement = document.body;
        }

        this.domElement = domElement;
        this.object = new Object3D();
        this.isLocked = false;
        this.isSprinting = false;

        // Set to constrain the pitch of the camera
        // Range is 0 to Math.PI radians
        this.minPolarAngle = 0; // radians
        this.maxPolarAngle = Math.PI; // radians

        const scope = this;
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.object.add(this.camera);

        this.focus = new Vector3(0, 25, -50);

        function onMouseMove(event: MouseEvent) {
            if (scope.isLocked === false) return;
            var offset = new Vector3();
            offset.copy(scope.camera.position).sub(scope.focus);

            var spherical = new Spherical();
            spherical.setFromVector3(offset);

            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;

            spherical.theta -= movementX * 0.002;
            spherical.phi -= movementY * 0.002;

            var sphericalVec = new Vector3();
            sphericalVec.setFromSpherical(spherical);

            scope.camera.position.copy(scope.focus.clone().add(sphericalVec));
            scope.camera.lookAt(scope.focus.clone().add(scope.object.position));
        }

        function onPointerlockChange() {
            if (scope.domElement.ownerDocument.pointerLockElement === scope.domElement) {
                scope.isLocked = true;
            } else {
                scope.isLocked = false;
            }
        }

        function onPointerlockError() {
            console.error("THREE.PointerLockControls: Unable to use Pointer Lock API");
        }

        function onClick() {
            scope.lock();
        }
        this.connect = function () {
            scope.domElement.ownerDocument.addEventListener("mousemove", onMouseMove);
            scope.domElement.addEventListener("click", onClick);
            scope.domElement.ownerDocument.addEventListener("pointerlockchange", onPointerlockChange);
            scope.domElement.ownerDocument.addEventListener("pointerlockerror", onPointerlockError);
            scope.domElement.ownerDocument.addEventListener("keydown", this.onKeyDown.bind(this));
            scope.domElement.ownerDocument.addEventListener("keyup", this.onKeyUp.bind(this));
        };

        this.disconnect = function () {
            scope.domElement.ownerDocument.removeEventListener("mousemove", onMouseMove);
            scope.domElement.ownerDocument.removeEventListener("pointerlockchange", onPointerlockChange);
            scope.domElement.ownerDocument.removeEventListener("pointerlockerror", onPointerlockError);
            scope.domElement.ownerDocument.removeEventListener("keydown", this.onKeyDown.bind(this));
            scope.domElement.ownerDocument.removeEventListener("keyup", this.onKeyUp.bind(this));
        };

        this.dispose = function () {
            this.disconnect();
        };

        this.getObject = function () {
            // retaining this method for backward compatibility

            return scope.camera;
        };

        this.getDirection = (function () {
            const direction = new Vector3(0, 0, -1);

            return function (v: Vector3) {
                return v.copy(direction).applyQuaternion(scope.camera.quaternion);
            };
        })();

        this.moveForward = function (distance: number) {
            // move forward parallel to the xz-plane
            // assumes camera.up is y-up

            _vector.setFromMatrixColumn(scope.camera.matrix, 0);

            _vector.crossVectors(scope.camera.up, _vector);

            scope.object.position.addScaledVector(_vector, distance);
        };

        this.moveRight = function (distance: number) {
            _vector.setFromMatrixColumn(scope.camera.matrix, 0);

            scope.object.position.addScaledVector(_vector, distance);
        };

        this.lock = function () {
            this.domElement.requestPointerLock();
        };

        this.unlock = function () {
            scope.domElement.ownerDocument.exitPointerLock();
        };

        this.model = character_scene.scene.children[0];
        console.log(this.model);
        //this.model.scale.setScalar(20);
        //this.model.frustumCulled = false;
        this.model.translateY(-50);
        this.model.translateZ(0);
        this.model.scale.setScalar(3);
        this.model.rotateY(_PI_2 * 2);
        this.model.rotateZ(_PI_2);
        this.object.add(this.model);
        scene.add(this.object);

        this.model.traverse((object) => {
            object.frustumCulled = false;
        });

        //var mesh = this.model.children[0];

        console.log(this.model);

        //const skeleton = new Skeleton([this.model.children[0].children[0] as Bone]);
        //mesh.bind(skeleton);

        var test = new AnimationObjectGroup(
            this.model.children[1],
            this.model.children[2],
            this.model.children[3],
            this.model.children[4],
            this.model.children[5]
        );

        this.mixer = new AnimationMixer(test);

        this.run = this.mixer.clipAction(retargetBVH(character_run_anim, this.model.children[1]));
        this.walk = this.mixer.clipAction(retargetBVH(character_walk_anim, this.model.children[1]));
        this.jump = this.mixer.clipAction(retargetBVH(character_jump_anim, this.model.children[1]));

        this.lastAction = this.walk;
        this.mixer.timeScale = 0.001;

        //this.mixer.clipAction(retargetBVH(character_idle2_anim, this.model.children[1])).play();
        this.walk.play();
        this.animState = AnimState.Walking;

        this.connect();
    }

    onKeyDown(event: KeyboardEvent) {
        if (event.code == "KeyW" || event.code == "ArrowUp") {
            this.movementState = MovementState.Forward;
        } else if (event.code == "KeyS" || event.code == "ArrowDown") {
            this.movementState = MovementState.Back;
        } else if (event.code == "KeyA" || event.code == "ArrowLeft") {
            this.movementState = MovementState.Left;
        } else if (event.code == "KeyD" || event.code == "ArrowRight") {
            this.movementState = MovementState.Right;
        } else if (event.code == "ShiftLeft") {
            this.isSprinting = true;
        }
    }
    onKeyUp(event: KeyboardEvent) {
        if ((event.code == "KeyW" || event.code == "ArrowUp") && this.movementState == MovementState.Forward) {
            this.movementState = MovementState.Idle;
        } else if ((event.code == "KeyS" || event.code == "ArrowDown") && this.movementState == MovementState.Back) {
            this.movementState = MovementState.Idle;
        } else if ((event.code == "KeyA" || event.code == "ArrowLeft") && this.movementState == MovementState.Left) {
            this.movementState = MovementState.Idle;
        } else if ((event.code == "KeyD" || event.code == "ArrowRight") && this.movementState == MovementState.Right) {
            this.movementState = MovementState.Idle;
        } else if (event.code == "ShiftLeft") {
            this.isSprinting = false;
        }
    }
    update(deltaTime: number) {
        this.mixer.update(deltaTime);

        var speed = _speed;

        if (this.isSprinting) {
            speed *= 2;
            if (this.animState != AnimState.Running) {
                this.run.enabled = true;
                this.run.crossFadeFrom(this.lastAction, 0.6, true).play();
                this.lastAction = this.run;
                this.animState = AnimState.Running;
            }
        } else if (this.movementState != MovementState.Idle) {
            if (this.animState != AnimState.Walking) {
                this.walk.enabled = true;
                this.walk.crossFadeFrom(this.lastAction, 0.6, true).play();
                this.lastAction = this.walk;
                this.animState = AnimState.Walking;
            }
        } else {
            if (this.animState != AnimState.Idle) {
                this.animState = AnimState.Idle;
                this.lastAction.warp(1, 0.1, 1).play();
            }
        }
        if (this.movementState == MovementState.Forward) {
            this.moveForward(deltaTime * speed);
        }
        if (this.movementState == MovementState.Back) {
            this.moveForward(-deltaTime * speed);
        }
        if (this.movementState == MovementState.Right) {
            this.moveRight(deltaTime * speed);
        }
        if (this.movementState == MovementState.Left) {
            this.moveRight(-deltaTime * speed);
        }

        if (this.movementState != MovementState.Idle) {
            var cameraEuler = new Euler().setFromQuaternion(this.camera.quaternion);
            cameraEuler.z += _PI_2 * 2;
            var modelEuler = new Euler().setFromQuaternion(this.model.quaternion);
            cameraEuler.x = modelEuler.x;
            cameraEuler.y = modelEuler.y;
            var quat = new Quaternion().setFromEuler(cameraEuler);
            this.model.quaternion.slerp(quat, deltaTime * 0.01);
        }
    }
}
