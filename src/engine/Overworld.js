import { OverworldMap } from "./OverworldMap.js";
import { DirectionInput } from "./DirectionInput.js";
import { KeyPressListener } from "./KeyPressListener.js";
import { OverworldMaps } from "../maps/index.js";
import { utils } from "./utils.js";

export class Overworld {

    constructor(config) {
        this.element = config.element;
        this.canvas = this.element.querySelector(".game-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.map = null;
        this.isGameLoopRunning = false;
        //Keyed "MapId:x,y" - one-shot cutscene spaces that have already fired.
        this.completedOneShots = {};
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
                    //Update all objects
                    Object.values(map.gameObjects).forEach(object => {
                        object.update({
                        arrow: this.directionInput.direction,
                        map,
                        })
                    })

                    //One clamped camera offset per frame, shared by every layer
                    const camera = map.getCamera(cameraPerson, this.canvas);

                    // draw lower layer
                    map.drawLowerImage(this.ctx, cameraPerson, camera);

                    //Draw Game Objects
                    Object.values(map.gameObjects).forEach(object => {
                        object.sprite.draw(this.ctx, cameraPerson, camera);
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
          //Is there a person here to talk to?
          this.map && this.map.checkForActionCutscene()
        })
    }

    bindHeroPositionCheck() {
        document.addEventListener("PersonWalkingComplete", e => {
            if (e.detail.whoId === "hero") {
            //Hero's position has changed
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

        this.startMap("Bedroom");

        this.bindActionInput();
        this.bindHeroPositionCheck();

        this.startGameLoop();
    }

}
