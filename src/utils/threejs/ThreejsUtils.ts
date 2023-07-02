import * as THREE from "three";

export class ThreejsUtils {
    
    public static toScreenPosition(renderer, obj, camera, devicePixelRatio: number) {
        let vector = new THREE.Vector3();
        
        let widthHalf = 0.5 * renderer.getContext().canvas.width;
        let heightHalf = 0.5 * renderer.getContext().canvas.height;

        obj.updateMatrixWorld();
        vector.setFromMatrixPosition(obj.matrixWorld);
        vector.project(camera);

        vector.x = (vector.x * widthHalf) + widthHalf;
        vector.y = - (vector.y * heightHalf) + heightHalf;
        
        return {
            x: vector.x / devicePixelRatio,
            y: vector.y / devicePixelRatio
        };

    }

}