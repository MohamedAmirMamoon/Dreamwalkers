import { OverworldEvent } from "./OverworldEvent.js";
import { Person } from "./Person.js";
import { utils } from "./utils.js";

//Blueprint "type" -> constructor. Map configs are plain data; the classes are
//only instantiated here, at mount time, so every visit gets fresh objects.
const GAME_OBJECT_CLASSES = {
  Person,
};

//The camera keeps the hero at this point of the viewport when it can.
const CAMERA_ANCHOR_X = 10.5;
const CAMERA_ANCHOR_Y = 6;

export class OverworldMap {
    constructor(config) {
      this.overworld = null;
      this.id = config.id || null;
      this.configuration = config;

      //Live state for this visit. Nothing here is shared with the blueprint.
      this.gameObjects = {};
      this.cutsceneSpaces = config.cutsceneSpaces || {};

      //Walls get mutated constantly (every step moves one), so this must be a
      //copy or walking around would corrupt the authored map data.
      this.walls = Object.assign({}, config.walls);

      this.lowerImage = null;
      if (config.lowerSrc) {
        this.lowerImage = new Image();
        this.lowerImage.src = config.lowerSrc;
      }

      this.upperImage = null;
      if (config.upperSrc) {
        this.upperImage = new Image();
        this.upperImage.src = config.upperSrc;
      }

      this.isCutscenePlaying = false;
      //Set false by unmount(); everything async checks this before continuing.
      this.isActive = true;

      //Coordinate key of the cutscene space that fired most recently, so
      //standing on (or next to) it doesn't re-trigger it every footstep.
      this.activeCutsceneSpaceKey = null;
    }

    //Map art dimensions, or null while the image is still loading.
    getMapDimensions() {
      const image = this.lowerImage;
      if (!image || !image.naturalWidth || !image.naturalHeight) {
        return null;
      }
      return { width: image.naturalWidth, height: image.naturalHeight };
    }

    //Returns the offset to add to (drawn position - cameraPerson position).
    //Clamped so the camera never scrolls past the edge of the art, and centered
    //on any axis where the art is smaller than the viewport.
    getCamera(cameraPerson, canvas) {
      const offset = {
        x: utils.withGrid(CAMERA_ANCHOR_X),
        y: utils.withGrid(CAMERA_ANCHOR_Y),
      };
      const dimensions = this.getMapDimensions();
      if (!dimensions || !canvas) {
        //Image hasn't loaded yet - fall back to the unclamped camera. The next
        //frame after load will clamp properly.
        return offset;
      }

      const viewX = clampView(cameraPerson.x - offset.x, dimensions.width, canvas.width);
      const viewY = clampView(cameraPerson.y - offset.y, dimensions.height, canvas.height);

      return {
        x: cameraPerson.x - viewX,
        y: cameraPerson.y - viewY,
      };
    }

    drawLowerImage(ctx, cameraPerson, camera) {
      if (!this.lowerImage) {
        return;
      }
      const offset = camera || this.getCamera(cameraPerson, ctx.canvas);
      ctx.drawImage(
        this.lowerImage,
        offset.x - cameraPerson.x,
        offset.y - cameraPerson.y
        )
    }

    drawUpperImage(ctx, cameraPerson, camera) {
      if (!this.upperImage) {
        return;
      }
      const offset = camera || this.getCamera(cameraPerson, ctx.canvas);
      ctx.drawImage(
        this.upperImage,
        offset.x - cameraPerson.x,
        offset.y - cameraPerson.y
      )
    }

    isSpaceTaken(currentX, currentY, direction) {
      const {x,y} = utils.nextPosition(currentX, currentY, direction);
      return this.walls[`${x},${y}`] || false;
    }

    mountObjects() {
      const blueprints = this.configuration.gameObjects || {};
      Object.keys(blueprints).forEach(key => {

        const blueprint = blueprints[key];
        const ObjectClass = GAME_OBJECT_CLASSES[blueprint.type] || Person;
        const object = new ObjectClass({ ...blueprint, id: key });
        object.id = key;
        this.gameObjects[key] = object;

        //TODO: determine if this object should actually mount
        object.mount(this);

      })
    }

    //Tear the map down: stop the cutscene loop and every behavior loop so they
    //can't keep running against a map that is no longer on screen.
    unmount() {
      this.isActive = false;
      this.isCutscenePlaying = false;
      Object.values(this.gameObjects).forEach(object => object.unmount());
    }

    async startCutscene(events) {
      this.isCutscenePlaying = true;

      for (let i=0; i<events.length; i++) {
        //Bail out if the map was swapped out mid-cutscene (e.g. a changeMap
        //event, or the player was moved to another map some other way).
        if (!this.isActive) {
          return;
        }
        const eventHandler = new OverworldEvent({
          event: events[i],
          map: this,
        })
        await eventHandler.init();
      }

      if (!this.isActive) {
        return;
      }

      this.isCutscenePlaying = false;

      //Reset NPCs to do their idle behavior
      Object.values(this.gameObjects).forEach(object => object.doBehaviorEvent(this))
    }

    checkForActionCutscene() {
      const hero = this.gameObjects["hero"];
      if (!hero) {
        return;
      }
      const nextCoords = utils.nextPosition(hero.x, hero.y, hero.direction);
      const match = Object.values(this.gameObjects).find(object => {
        return `${object.x},${object.y}` === `${nextCoords.x},${nextCoords.y}`
      });
      if (!this.isCutscenePlaying && match && match.talking.length) {
        this.startCutscene(match.talking[0].events)
      }
    }

    checkForFootstepCutscene() {
      const hero = this.gameObjects["hero"];
      if (!hero) {
        return;
      }
      const heroKey = `${hero.x},${hero.y}`;

      //Let go of the last trigger once the hero has stepped clear of it, so
      //that a space doesn't re-fire while the hero lingers on or beside it.
      if (this.activeCutsceneSpaceKey && !isWithinOneTile(heroKey, this.activeCutsceneSpaceKey)) {
        this.activeCutsceneSpaceKey = null;
      }

      const match = this.cutsceneSpaces[heroKey];
      if (this.isCutscenePlaying || !match || this.activeCutsceneSpaceKey) {
        return;
      }

      const space = match[0];
      if (space.oneShot && this.hasCompletedOneShot(heroKey)) {
        return;
      }
      if (space.oneShot) {
        this.markCompletedOneShot(heroKey);
      }

      this.activeCutsceneSpaceKey = heroKey;
      this.startCutscene( space.events )
    }

    //One-shot spaces are remembered by the Overworld so they stay fired even
    //after leaving and re-entering the map.
    hasCompletedOneShot(coordKey) {
      return !!this.overworld && this.overworld.hasCompletedOneShot(this.id, coordKey);
    }
    markCompletedOneShot(coordKey) {
      this.overworld && this.overworld.markCompletedOneShot(this.id, coordKey);
    }

    addWall(x,y) {
      this.walls[`${x},${y}`] = true;
    }
    removeWall(x,y) {
      delete this.walls[`${x},${y}`]
    }
    moveWall(wasX, wasY, direction) {
      this.removeWall(wasX, wasY);
      const {x,y} = utils.nextPosition(wasX, wasY, direction);
      this.addWall(x,y);
    }

  }

//Top-left of the viewport in map space: clamped to the art, or centered when
//the art is smaller than the viewport (so it never scrolls into black).
function clampView(desired, mapSize, viewSize) {
  const max = mapSize - viewSize;
  if (max <= 0) {
    return Math.round(max / 2);
  }
  return Math.min(Math.max(desired, 0), max);
}

function isWithinOneTile(keyA, keyB) {
  const [ax, ay] = keyA.split(",").map(Number);
  const [bx, by] = keyB.split(",").map(Number);
  const tile = utils.withGrid(1);
  return Math.abs(ax - bx) <= tile && Math.abs(ay - by) <= tile;
}
