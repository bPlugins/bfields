/*
 * The dashboard's images, bundled into demo/build/ by webpack rather than
 * served from a PHP-supplied base URL: the demo has no admin/ folder of its own.
 */
import headphones from '../images/headphones.webp';
import needHelp from '../images/need-help.webp';
import armchair from '../images/demo-armchair.webp';
import camera from '../images/demo-camera.webp';
import canvasShoe from '../images/demo-canvas-shoe.webp';
import cube from '../images/demo-cube.webp';
import drone from '../images/demo-drone.webp';
import demoHeadphones from '../images/demo-headphones.webp';
import officeChair from '../images/demo-office-chair.webp';
import runningShoe from '../images/demo-running-shoe.webp';
import sneaker from '../images/demo-sneaker.webp';
import turntable from '../images/demo-turntable.webp';
import vrHeadset from '../images/demo-vr-headset.webp';
import watch from '../images/demo-watch.webp';

export const HERO_IMAGE = headphones;
export const HELP_IMAGE = needHelp;

/** Demo card thumbnails, by the `img` key each card carries. */
export const DEMO_IMAGES: Record<string, string> = {
    armchair,
    camera,
    'canvas-shoe': canvasShoe,
    cube,
    drone,
    headphones: demoHeadphones,
    'office-chair': officeChair,
    'running-shoe': runningShoe,
    sneaker,
    turntable,
    'vr-headset': vrHeadset,
    watch,
};
