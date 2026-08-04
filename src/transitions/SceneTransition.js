//Old-school Pokemon warp wipe: the game freezes, a hard-edged black circle
//closes in on the hero, the map swaps behind the black, then the circle opens
//back out in reverse. No flash, no title card - just the wipe.

export const TIMING = {
  close: 420,     // circle closing in
  hold: 140,      // beat of full black while the map swaps
  open: 420,      // circle opening back out
  reduced: 80,    // per-step duration when prefers-reduced-motion is set
};

//Diameter (px, canvas space) that fully clears a 352x198 viewport from any
//origin. Worst case is a corner: sqrt(352^2 + 198^2) ~ 404, so 2x that.
const OPEN_DIAMETER = 820;

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
    //Headless hosts (tests, SSR) get a no-op transition rather than a crash.
    if (!element || !element.classList
        || typeof element.classList.add !== "function"
        || typeof element.classList.remove !== "function"
        || typeof element.classList.toggle !== "function") {
      return;
    }
    this.element = element;
    this.element.classList.add("SceneTransition");
    this.element.innerHTML = `<div class="SceneTransition_iris"></div>`;
    this.container.appendChild(this.element);
    this.iris = this.element.querySelector(".SceneTransition_iris");
  }

  //Centre of the circle, in canvas pixels (the container is 352x198 CSS px, so
  //canvas space maps 1:1 before the container's scale transform).
  setOrigin(origin) {
    if (!this.iris || !this.iris.style) return;
    const { x, y } = origin || { x: 176, y: 99 };
    this.iris.style.left = `${x}px`;
    this.iris.style.top = `${y}px`;
  }

  //Set the hole size directly. Kept as px so the disc is always a true circle -
  //percentages would make it an ellipse in a non-square container.
  setDiameter(px) {
    if (!this.iris || !this.iris.style) return;
    this.iris.style.width = `${px}px`;
    this.iris.style.height = `${px}px`;
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  //Force the browser to apply pending style changes before we start animating,
  //so the first transition isn't skipped.
  flushStyles() {
    if (this.iris && typeof this.iris.getBoundingClientRect === "function") {
      this.iris.getBoundingClientRect();
    }
  }

  reset() {
    if (!this.element) return;
    this.element.classList.remove("is-active", "is-animating", "is-reduced");
    this.setDiameter(OPEN_DIAMETER);
  }

  //close -> [swap] -> open. `swap` runs while the screen is fully black.
  async play({ origin, swap }) {
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
      ? { close: TIMING.reduced, hold: 0, open: TIMING.reduced }
      : TIMING;

    try {
      this.element.classList.toggle("is-reduced", reduced);
      this.element.classList.add("is-active");
      this.setOrigin(origin);
      this.setDiameter(OPEN_DIAMETER);
      this.flushStyles();

      //Close in on the hero
      this.element.classList.add("is-animating");
      this.setDiameter(0);
      await this.wait(t.close);

      //Fully black - safe to change everything underneath
      if (swap) {
        await swap();
      }
      if (t.hold) {
        await this.wait(t.hold);
      }

      //Open back out, same wipe in reverse
      this.setDiameter(OPEN_DIAMETER);
      await this.wait(t.open);
    } finally {
      //However we got here, the overlay must end up out of the way. A stuck
      //black screen is worse than no transition at all.
      this.reset();
      this.isPlaying = false;
    }
  }

  //First load: start fully black, then open onto the starting map.
  async playIntro({ swap }) {
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
    const open = reduced ? TIMING.reduced : TIMING.open;

    try {
      this.element.classList.toggle("is-reduced", reduced);
      this.element.classList.add("is-active");
      this.setOrigin({ x: 176, y: 99 });
      this.setDiameter(0);
      this.flushStyles();

      if (swap) {
        await swap();
      }

      this.element.classList.add("is-animating");
      this.setDiameter(OPEN_DIAMETER);
      await this.wait(open);
    } finally {
      this.reset();
      this.isPlaying = false;
    }
  }
}
