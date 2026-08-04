import { OverworldMap } from "./OverworldMap.js";
import { DirectionInput } from "./DirectionInput.js";
import { KeyPressListener } from "./KeyPressListener.js";
import { OverworldMaps } from "../maps/index.js";
import { utils } from "./utils.js";
import { SceneTransition } from "../transitions/SceneTransition.js";

export class Overworld {

    constructor(config) {
        this.element = config.element;
        this.canvas = this.element.querySelector(".game-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.map = null;
        this.isGameLoopRunning = false;
        //Keyed "MapId:x,y" - one-shot cutscene spaces that have already fired.
        this.completedOneShots = {};
        //True for the whole duration of a scene transition. Freezes the world
        //(no updates, no input) so the scene holds still under the wipe.
        this.isTransitioning = false;
        this.transition = new SceneTransition(this.element);
    }

    //Where the hero sits on screen, in canvas pixels - the circle closes on the
    //character rather than the middle of the screen. The overlay is the same
    //352x198 box as the canvas, so these coordinates map straight across.
    getHeroOriginPixels() {
        const fallback = {
            x: this.canvas ? this.canvas.width / 2 : 176,
            y: this.canvas ? this.canvas.height / 2 : 99,
        };
        const map = this.map;
        const hero = map && map.gameObjects.hero;
        if (!hero || !this.canvas) {
            return fallback;
        }
        //Sprite.draw puts the hero at (camera.x - 8, camera.y - 18) on screen,
        //since for the camera person the world terms cancel. Nudge to the middle
        //of the 32x32 sprite so the circle closes on the character, not its corner.
        const camera = map.getCamera(hero, this.canvas);
        return {
            x: clampTo(camera.x - 8 + 16, this.canvas.width, fallback.x),
            y: clampTo(camera.y - 18 + 20, this.canvas.height, fallback.y),
        };
    }

    //Resolves once the map's art has actually decoded, so the iris never opens
    //onto a blank screen the first time a big map is visited.
    waitForMapArt(map, timeout = 2500) {
        const image = map && map.lowerImage;
        if (!image || image.complete || image.naturalWidth) {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                image.removeEventListener && image.removeEventListener("load", finish);
                image.removeEventListener && image.removeEventListener("error", finish);
                resolve();
            };
            //Don't hang the transition forever if the asset 404s.
            setTimeout(finish, timeout);
            if (image.addEventListener) {
                image.addEventListener("load", finish);
                image.addEventListener("error", finish);
            } else {
                resolve();
            }
        });
    }

    //Swaps maps behind the circle wipe. Returns a promise that settles only once
    //the new map is fully revealed, so the world stays frozen for the whole
    //animation.
    async transitionToMap(mapId) {
        if (this.isTransitioning) {
            return;
        }
        const origin = this.getHeroOriginPixels();
        //Read the origin BEFORE freezing so the last drawn frame is what the
        //circle closes on.
        this.isTransitioning = true;
        try {
            await this.transition.play({
                origin,
                swap: async () => {
                    this.startMap(mapId);
                    await this.waitForMapArt(this.map);
                },
            });
        } finally {
            this.isTransitioning = false;
        }
    }

    startGameLoop() {
        //Guard against ever having two RAF loops running at once
        if (this.isGameLoopRunning) {
            return;
        }
        this.isGameLoopRunning = true;

        const step = () => {

            // clear canvas here
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            const map = this.map;
            if (map) {
                // establish camera person
                const cameraPerson = map.gameObjects.hero;

                if (cameraPerson) {
                    //Freeze the world for the whole wipe, the way the old games
                    //do: nobody moves, no sprite animates, held arrow keys are
                    //ignored. We keep drawing so the frozen frame stays on
                    //screen (and so the new map paints once it's swapped in).
                    if (!this.isTransitioning) {
                        const arrow = this.directionInput.direction;
                        Object.values(map.gameObjects).forEach(object => {
                            object.update({
                            arrow,
                            map,
                            })
                        })
                    }

                    //One clamped camera offset per frame, shared by every layer
                    const camera = map.getCamera(cameraPerson, this.canvas);

                    // draw lower layer
                    map.drawLowerImage(this.ctx, cameraPerson, camera);

                    //Draw Game Objects. Sprite.draw ticks its own animation, so
                    //it needs telling not to while the world is frozen.
                    const advance = !this.isTransitioning;
                    Object.values(map.gameObjects).forEach(object => {
                        object.sprite.draw(this.ctx, cameraPerson, camera, advance);
                    })

                    // draw upper layer
                    map.drawUpperImage(this.ctx, cameraPerson, camera);
                }
            }

            requestAnimationFrame(() => {
                step();
            })
        }
        step();
    }

    bindActionInput() {
        new KeyPressListener("Enter", () => {
          //Is there a person here to talk to? Not while the screen is wiping -
          //a message box opening over the transition would strand the cutscene.
          if (this.isTransitioning) {
            return;
          }
          this.map && this.map.checkForActionCutscene()
        })
    }

    bindHeroPositionCheck() {
        document.addEventListener("PersonWalkingComplete", e => {
            if (e.detail.whoId === "hero") {
            //Hero's position has changed. Ignore steps that land during a
            //transition so the destination's own footstep triggers can't fire early.
            if (this.isTransitioning) {
                return;
            }
            this.map && this.map.checkForFootstepCutscene()
            }
        })
    }

    hasCompletedOneShot(mapId, coordKey) {
        return !!this.completedOneShots[`${mapId}:${coordKey}`];
    }
    markCompletedOneShot(mapId, coordKey) {
        this.completedOneShots[`${mapId}:${coordKey}`] = true;
    }

    //Accepts a map id from OverworldMaps. Every call builds a brand new
    //OverworldMap from the blueprint, so spawn points, NPC state and walls are
    //always the authored ones.
    startMap(mapId) {
        const config = OverworldMaps[mapId];
        if (!config) {
            console.warn(`Unknown map: ${mapId}`);
            return;
        }

        //Tear the old map down first so its cutscene and behavior loops stop
        if (this.map) {
            const oldMap = this.map;
            this.map = null;
            oldMap.unmount();
            utils.emitEvent("MapUnmounted", { map: oldMap });
        }

        this.map = new OverworldMap({ ...config, id: mapId });
        this.map.overworld = this;
        this.map.mountObjects();
    }

    init() {
        this.directionInput = new DirectionInput();
        this.directionInput.init();

        this.bindActionInput();
        this.bindHeroPositionCheck();

        this.startGameLoop();

        //Open on the starting level with the same wipe, rather than popping in.
        this.isTransitioning = true;
        this.transition.playIntro({
            swap: async () => {
                this.startMap("Jungle");
                await this.waitForMapArt(this.map);
            },
        }).finally(() => {
            this.isTransitioning = false;
        });
    }

}

//Keep the circle's centre inside the viewport, and fall back to the middle if
//the camera math ever produces something non-finite.
function clampTo(value, max, fallback) {
    if (!Number.isFinite(value)) {
        return fallback;
    }
    return Math.min(Math.max(value, 0), max);
}
