import { utils } from "./utils.js";

//Default sheet layout: 128x128 = a 4x4 grid of 32x32 frames.
//Column 0 is the idle frame, columns 1 and 3 are the walk frames.
//Rows are down / right / up / left.
export const FOUR_FRAME_ANIMATIONS = {
    "idle-down" : [ [0,0] ],
    "idle-right": [ [0,1] ],
    "idle-up"   : [ [0,2] ],
    "idle-left" : [ [0,3] ],
    "walk-down" : [ [1,0],[0,0],[3,0],[0,0], ],
    "walk-right": [ [1,1],[0,1],[3,1],[0,1], ],
    "walk-up"   : [ [1,2],[0,2],[3,2],[0,2], ],
    "walk-left" : [ [1,3],[0,3],[3,3],[0,3], ]
};

//For sheets that only have a single row of two 32x32 frames (e.g. snake.png at
//64x32). Every direction reuses the same two frames.
export const TWO_FRAME_ANIMATIONS = {
    "idle-down" : [ [0,0] ],
    "idle-right": [ [0,0] ],
    "idle-up"   : [ [0,0] ],
    "idle-left" : [ [0,0] ],
    "walk-down" : [ [0,0],[1,0] ],
    "walk-right": [ [0,0],[1,0] ],
    "walk-up"   : [ [0,0],[1,0] ],
    "walk-left" : [ [0,0],[1,0] ]
};

export class Sprite {
    constructor(config) {

        // set up image
        this.image = new Image();
        this.image.src = config.src;
        this.image.onload = () => {
            this.isLoaded = true;
        }

        // shadow here
        this.shadow = new Image();
        this.useShadow = true;
        if(this.useShadow) {
            this.shadow.src = "/images/characters/shadow.png";
        }
        this.shadow.onload = () => {
            this.IsShadowLoaded = true;
        }

        // frame size on the sheet, and how big to draw it
        this.frameWidth = config.frameWidth || 32;
        this.frameHeight = config.frameHeight || 32;

        // configure animation & initial state
        this.animations = config.animations || FOUR_FRAME_ANIMATIONS;
        this.currentAnimation = config.currentAnimation || "idle-down";
        this.currentAnimationFrame = 0;

        this.animationFrameLimit = config.animationFrameLimit || 4;
        this.animationFrameProgress = this.animationFrameLimit;

        // initialize gameObject
        this.gameObject = config.gameObject;
    }

    get frame() {
        return this.animations[this.currentAnimation][this.currentAnimationFrame];
    }

    setAnimation(key) {
        if (!this.animations[key]) {
            return;
        }
        if(this.currentAnimation != key) {
            this.currentAnimation = key;
            this.currentAnimationFrame = 0;
            this.animationFrameProgress =  this.animationFrameLimit;
        }
    }

    updateAnimationProgress() {
        // Downtick frame progress
        if (this.animationFrameProgress > 0) {
            this.animationFrameProgress -= 1;
            return;
        }

          //Reset the counter
          this.animationFrameProgress = this.animationFrameLimit;
          this.currentAnimationFrame += 1;

        if (this.frame === undefined) {
            this.currentAnimationFrame = 0
        }
    }

    //`advanceAnimation: false` redraws the current frame without ticking the
    //animation forward - used to hold the world still during a scene transition.
    draw(ctx, cameraPerson, camera, advanceAnimation = true) {
        const offset = camera || { x: utils.withGrid(10.5), y: utils.withGrid(6) };
        const x = this.gameObject.x - 8 + offset.x - cameraPerson.x;
        const y = this.gameObject.y - 18 + offset.y - cameraPerson.y;

        // here implement shadow
        this.IsShadowLoaded && ctx.drawImage(this.shadow, x, y);

        const[frameX, frameY] = this.frame;
        // here we can change based off sprite sheet
        this.isLoaded && ctx.drawImage(
            this.image,
            frameX * this.frameWidth, frameY * this.frameHeight,
            this.frameWidth, this.frameHeight,
            x,y,
            this.frameWidth, this.frameHeight
        )

        if (advanceAnimation) {
            this.updateAnimationProgress();
        }
    }
}
