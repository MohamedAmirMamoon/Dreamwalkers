import { TextMessage } from "../ui/TextMessage.js";
import { utils } from "./utils.js";

export class OverworldEvent {
    constructor({ map, event}) {
      this.map = map;
      this.event = event;
    }

    //Wait for `eventName` from the right person. Also gives up (and unbinds) if
    //the map is torn down first, so a map change can never leak a listener or
    //leave a promise pending forever.
    waitFor(eventName, resolve) {
      const map = this.map;
      const completeHandler = e => {
        if (e.detail.whoId === this.event.who) {
          cleanUp();
          resolve();
        }
      };
      const unmountHandler = e => {
        if (e.detail.map === map) {
          cleanUp();
          resolve();
        }
      };
      const cleanUp = () => {
        document.removeEventListener(eventName, completeHandler);
        document.removeEventListener("MapUnmounted", unmountHandler);
      };

      //Already gone - don't bother binding anything
      if (!map.isActive) {
        resolve();
        return;
      }

      document.addEventListener(eventName, completeHandler);
      document.addEventListener("MapUnmounted", unmountHandler);
    }

    stand(resolve) {
      const who = this.map.gameObjects[ this.event.who ];
      if (!who) {
        resolve();
        return;
      }
      who.startBehavior({
        map: this.map
      }, {
        type: "stand",
        direction: this.event.direction,
        time: this.event.time
      })

      //Set up a handler to complete when correct person is done standing, then resolve the event
      this.waitFor("PersonStandComplete", resolve);
    }

    walk(resolve) {
      const who = this.map.gameObjects[ this.event.who ];
      if (!who) {
        resolve();
        return;
      }
      who.startBehavior({
        map: this.map
      }, {
        type: "walk",
        direction: this.event.direction,
        retry: true
      })

      //Set up a handler to complete when correct person is done walking, then resolve the event
      this.waitFor("PersonWalkingComplete", resolve);
    }

    textMessage(resolve) {

      if (this.event.faceHero) {
        const obj = this.map.gameObjects[this.event.faceHero];
        const hero = this.map.gameObjects["hero"];
        if (obj && hero) {
          obj.direction = utils.oppositeDirection(hero.direction);
        }
      }

      const message = new TextMessage({
        text: this.event.text,
        onComplete: () => resolve()
      })
      message.init( document.querySelector(".game-container") )
    }

    changeMap(resolve) {
      //Resolve before swapping so the outgoing cutscene loop unwinds instead of
      //continuing to run events against the map we're about to destroy. It sees
      //isActive === false on the next iteration and stops.
      resolve();

      const overworld = this.map.overworld;
      if (!overworld) {
        return;
      }
      //Play the wipe when there is one; fall back to an instant swap so the
      //engine still works headless (the smoke harness has no CSS or layout).
      if (typeof overworld.transitionToMap === "function") {
        overworld.transitionToMap(this.event.map);
      } else {
        overworld.startMap(this.event.map);
      }
    }

    init() {
      return new Promise(resolve => {
        const handler = this[this.event.type];
        if (typeof handler !== "function") {
          console.warn(`Unknown event type: ${this.event.type}`);
          resolve();
          return;
        }
        handler.call(this, resolve);
      })
    }

  }
