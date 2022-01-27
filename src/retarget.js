// @ts-ignore
import { retargetClip } from "three/examples/jsm/utils/SkeletonUtils";

//borrowed from: https://jsfiddle.net/shootTheLuck/09z5ywte/134/
export function retargetBVH({ clip, skeleton }, model) {
    /* find model's weighted skeleton and give the model a pointer to it */
    if (!model.skeleton) {
        model.traverse((child) => {
            if (child.skeleton) {
                model.skeleton = child.skeleton;
            }
        });
    }

    // *Special Note* SkeletonUtils.retargetClip seems to output an animationClip
    // with more frames (time arrays) than necessary and a reduced duration.
    // I'm supplying fps and modifying input clip duration to fix that

    /* get fps from first track. */
    const fps = 1 / clip.tracks[0].times[1] || 1;
    clip.duration += 1 / fps;

    const options = {
        fps: fps,
    };

    const newClip = retargetClip(model, skeleton, clip, options);

    /* can dispose of bvhLoader skeleton */
    skeleton.dispose();

    /* THREE.SkinnedMesh.pose() to reset the model */
    model.traverse(function (child) {
        if (child.type === "SkinnedMesh") {
            child.pose();
        }
    });

    return newClip;
}
