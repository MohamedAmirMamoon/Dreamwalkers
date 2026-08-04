import { getLevelTitle } from "./levelTitles.js";

//Timings in ms. Tuned to feel snappy - a transition the player waits on twice
//is a transition they resent.
export const TIMING = {
  flash: 110,        // white blink, like stepping onto a warp tile
  irisClose: 460,    // circle wipe closing in on the hero
  titleHold: 950,    // how long the level name sits on screen
  irisOpen: 520,     // circle wipe opening onto the new map
  reduced: 90,       // per-step duration when prefers-reduced-motion is set
};

//Element structure is built once and reused, so a transition never has to
//touch the DOM layout mid-animation.
export class SceneTransition {
  constructor(container) {
    this.container = container;
    this.element = null;
    this.isPlaying = false;
    this.createElement();
  }

  prefersReducedMotion() {
    return typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  createElement() {
    if (!this.container || typeof document === "undefined" || !document.createElement) {
      return;
    }
    const element = document.createElement("div");
    //Only drive the overlay when we have a real element to drive. Headless
    //hosts (tests, SSR) get a no-op transition instead of a crash.
    if (!element || !element.classList
        || typeof element.classList.add !== "function"
        || typeof element.classList.remove !== "function"
        || typeof element.classList.toggle !== "function") {
      return;
    }
    this.element = element;
    this.element.classList.add("SceneTransition");
    this.element.innerHTML = `
      <div class="SceneTransition_iris"></div>
      <div class="SceneTransition_flash"></div>
      <div class="SceneTransition_card">
        <p class="SceneTransition_title"></p>
        <p class="SceneTransition_subtitle"></p>
      </div>
    `;
    this.container.appendChild(this.element);

    this.iris = this.element.querySelector(".SceneTransition_iris");
    this.flash = this.element.querySelector(".SceneTransition_flash");
    this.card = this.element.querySelector(".SceneTransition_card");
    this.titleEl = this.element.querySelector(".SceneTransition_title");
    this.subtitleEl = this.element.querySelector(".SceneTransition_subtitle");
  }

  //Point the iris should collapse toward, in percent of the viewport. Defaults
  //to centre; the hero's on-screen position is used when we can work it out so
  //the wipe closes on the character rather than the middle of the screen.
  setIrisOrigin(originPercent) {
    if (!this.iris) return;
    const { x, y } = originPercent || { x: 50, y: 50 };
    this.iris.style.setProperty("--iris-x", `${x}%`);
    this.iris.style.setProperty("--iris-y", `${y}%`);
  }

  setTitle(mapId) {
    if (!this.titleEl) return;
    const { title, subtitle } = getLevelTitle(mapId);
    this.titleEl.textContent = title || "";
    this.subtitleEl.textContent = subtitle || "";
    this.subtitleEl.style.display = subtitle ? "" : "none";
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  //Toggle a class and wait out its transition. Kept separate so the phases read
  //as a sequence rather than a pile of timers.
  async step(className, on, duration) {
    if (!this.element) {
      return;
    }
    this.element.classList.toggle(className, on);
    await this.wait(duration);
  }

  //Runs: flash -> iris closes -> [swap] -> title card -> iris opens.
  //`swap` is awaited while the screen is fully covered, so the player never
  //sees the outgoing map, an unloaded image, or a mid-swap camera jump.
  async play({ mapId, origin, swap }) {
    //Re-entrancy guard. A second transition while one is running would fight
    //over the same classes and could strand the overlay opaque.
    if (this.isPlaying) {
      if (swap) await swap();
      return;
    }
    this.isPlaying = true;

    //No overlay to animate (headless): just do the swap, instantly.
    if (!this.element) {
      try {
        if (swap) await swap();
      } finally {
        this.isPlaying = false;
      }
      return;
    }

    const reduced = this.prefersReducedMotion();
    const t = reduced
      ? { flash: 0, irisClose: TIMING.reduced, titleHold: TIMING.reduced, irisOpen: TIMING.reduced }
      : TIMING;

    try {
      this.setIrisOrigin(origin);
      this.setTitle(mapId);

      if (this.element) {
        this.element.classList.add("is-active");
        this.element.classList.toggle("is-reduced", reduced);
      }

      if (t.flash) {
        await this.step("is-flashing", true, t.flash);
        await this.step("is-flashing", false, 0);
      }

      //Close the iris down onto the hero
      await this.step("is-closed", true, t.irisClose);

      //Screen is covered - safe to change everything underneath
      if (swap) {
        await swap();
      }

      //Title card over the covered screen
      await this.step("is-titled", true, t.titleHold);
      //Fade the text out while the screen is still solid black, so the map is
      //never visible behind the title.
      await this.step("is-titled", false, reduced ? 0 : 200);

      //Open onto the new map
      await this.step("is-opening", true, 0);
      await this.step("is-closed", false, t.irisOpen);
    } finally {
      //Whatever happened, the overlay must end up transparent and click-through.
      //A stuck opaque overlay is a hard-locked game.
      if (this.element) {
        this.element.classList.remove("is-active", "is-flashing", "is-titled", "is-closed", "is-opening", "is-reduced");
      }
      this.isPlaying = false;
    }
  }

  //Used on first load: start covered, then open onto the starting map.
  async playIntro({ mapId, swap }) {
    if (this.isPlaying) {
      if (swap) await swap();
      return;
    }
    this.isPlaying = true;

    if (!this.element) {
      try {
        if (swap) await swap();
      } finally {
        this.isPlaying = false;
      }
      return;
    }

    const reduced = this.prefersReducedMotion();
    const t = reduced
      ? { titleHold: TIMING.reduced, irisOpen: TIMING.reduced }
      : TIMING;

    try {
      this.setIrisOrigin({ x: 50, y: 50 });
      this.setTitle(mapId);
      if (this.element) {
        this.element.classList.add("is-active", "is-closed");
        this.element.classList.toggle("is-reduced", reduced);
      }
      if (swap) {
        await swap();
      }
      await this.step("is-titled", true, t.titleHold);
      await this.step("is-titled", false, reduced ? 0 : 200);
      await this.step("is-opening", true, 0);
      await this.step("is-closed", false, t.irisOpen);
    } finally {
      if (this.element) {
        this.element.classList.remove("is-active", "is-flashing", "is-titled", "is-closed", "is-opening", "is-reduced");
      }
      this.isPlaying = false;
    }
  }
}
