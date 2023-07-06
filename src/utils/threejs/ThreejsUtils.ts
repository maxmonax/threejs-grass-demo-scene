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

    public static getImageData(image) {
        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;

        var context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);

        return context.getImageData(0, 0, image.width, image.height);
    }

    public static getPixel(imagedata, x, y) {
        var position = (x + imagedata.width * y) * 4, data = imagedata.data;
        return { r: data[position], g: data[position + 1], b: data[position + 2], a: data[position + 3] };
    }



}