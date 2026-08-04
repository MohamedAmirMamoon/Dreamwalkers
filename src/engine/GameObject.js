import { Sprite } from "./Sprite.js";
import { OverworldEvent } from "./OverworldEvent.js";

export class GameObject {
    constructor(config) {
      this.id = config.id || null;
      this.isMounted = false;
      this.map = null;
      this.x = config.x || 0;
      this.y = config.y || 0;
      this.direction = config.direction || "down";
      this.sprite = new Sprite({
        gameObject: this,
        src: config.src || "/images/characters/people/Dreamwalker.png",
        animations: config.animations,
        currentAnimation: "idle-" + (config.direction || "down"),
        animationFrameLimit: config.animationFrameLimit,
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      });

      this.behaviorLoop = config.behaviorLoop || [];
      this.behaviorLoopIndex = 0;

      this.talking = config.talking || [];

      this.pendingTimeouts = [];
    }

    mount(map) {
      this.isMounted = true;
      this.map = map;
      map.addWall(this.x, this.y);

      //If we have a behavior, kick off after a short delay
      this.setTimeout(() => {
        this.doBehaviorEvent(map);
      }, 10)
    }

    //Called when the map this object lives on is torn down. Everything the
    //object has in flight has to stop here, otherwise behavior loops keep
    //recursing against a map that is no longer on screen.
    unmount() {
      this.isMounted = false;
      this.clearTimeouts();
    }

    //Timeouts registered here are automatically cancelled on unmount.
    setTimeout(callback, time) {
      const id = setTimeout(() => {
        this.pendingTimeouts = this.pendingTimeouts.filter(pending => pending !== id);
        callback();
      }, time);
      this.pendingTimeouts.push(id);
      return id;
    }

    clearTimeouts() {
      this.pendingTimeouts.forEach(id => clearTimeout(id));
      this.pendingTimeouts = [];
    }

    //True only while this object still belongs to the map that is on screen.
    isActiveOn(map) {
      return this.isMounted && !!map && map.isActive;
    }

    update() {
    }

    async doBehaviorEvent(map) {

      //Don't do anything if my map went away, if there is a more important
      //cutscene, or if I don't have config to do anything anyway.
      if (!this.isActiveOn(map) || map.isCutscenePlaying || this.behaviorLoop.length === 0 || this.isStanding) {
        return;
      }

      //Setting up our event with relevant info
      let eventConfig = { ...this.behaviorLoop[this.behaviorLoopIndex] };
      eventConfig.who = this.id;

      //Create an event instance out of our next event config
      const eventHandler = new OverworldEvent({ map, event: eventConfig });
      await eventHandler.init();

      //The map may have been swapped out while we were awaiting
      if (!this.isActiveOn(map)) {
        return;
      }

      //Setting the next event to fire
      this.behaviorLoopIndex += 1;
      if (this.behaviorLoopIndex === this.behaviorLoop.length) {
        this.behaviorLoopIndex = 0;
      }

      //Do it again!
      this.doBehaviorEvent(map);


    }


  }
