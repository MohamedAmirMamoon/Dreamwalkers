import { TextMessage } from "../ui/TextMessage.js";
import { QuestionMessage } from "../ui/QuestionMessage.js";
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

    //Drop an item into the hero's backpack, then continue. No-ops gracefully if
    //there's no inventory (e.g. the headless smoke harness) so cutscenes still run.
    addToInventory(resolve) {
      const inventory = this.map.overworld && this.map.overworld.inventory;
      if (inventory) {
        inventory.addItem(this.event.item);
      }
      resolve();
    }

    //Yes/No prompt. Runs the `yes`/`no` branch of sub-events based on the
    //choice, then resolves. Headless (no game-container) auto-picks the default
    //(yes) so cutscenes still run under the smoke harness.
    question(resolve) {
      const runBranch = async choice => {
        const branch = choice ? this.event.yes : this.event.no;
        if (Array.isArray(branch)) {
          for (const sub of branch) {
            if (!this.map.isActive) {
              break;
            }
            await new OverworldEvent({ map: this.map, event: sub }).init();
          }
        }
        resolve();
      };

      //A `when(map)` guard lets the prompt only appear under some condition
      //(e.g. the hero holds the flute). When it fails, skip straight to `no`
      //without ever showing the box.
      if (this.event.when && !this.event.when(this.map)) {
        runBranch(false);
        return;
      }

      const container = document.querySelector(".game-container");
      if (!container) {
        runBranch(true);
        return;
      }
      const prompt = new QuestionMessage({
        text: this.event.text,
        onDecide: choice => runBranch(choice),
      });
      prompt.init(container);
    }

    //Set a named story flag on the overworld (e.g. "snakeAsleep").
    setFlag(resolve) {
      const overworld = this.map.overworld;
      if (overworld) {
        overworld.setFlag(this.event.flag);
      }
      resolve();
    }

    //Remove a game object from the map (and free its wall), e.g. the snake once
    //it slithers off. No-ops if it's already gone.
    removeObject(resolve) {
      const who = this.map.gameObjects[this.event.who];
      if (who) {
        who.unmount();
        this.map.removeWall(who.x, who.y);
        delete this.map.gameObjects[this.event.who];
      }
      resolve();
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
