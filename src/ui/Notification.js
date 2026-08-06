//A small "toast" popup, separate from the dialogue TextMessage box. It's a gray
//box with black body text and a bold white item name, used to announce pickups:
//
//    Obtained **Flute**!
//
//Notifications queue and auto-dismiss, so several pickups in a row stack up and
//play one after another instead of overwriting each other. Nothing here freezes
//the overworld - the toast is purely cosmetic and the hero keeps playing.
export class Notification {
  constructor({ container }) {
    this.container = container;
    this.stack = null;
  }

  //The fixed container that holds active toasts, created lazily so the headless
  //smoke harness (which never shows UI) doesn't have to.
  ensureStack() {
    if (this.stack) {
      return;
    }
    this.stack = document.createElement("div");
    this.stack.classList.add("Notification_stack");
    this.container.appendChild(this.stack);
  }

  //Show "Obtained <name>!" with the name bold and white. `duration` is how long
  //it lingers before fading out (ms).
  obtained(name, { duration = 2600 } = {}) {
    this.show(`Obtained <strong>${name}</strong>!`, { duration });
  }

  //Generic entry point - `html` is trusted markup (callers build it, not user
  //input). Kept small on purpose; richer templating can come later.
  show(html, { duration = 2600 } = {}) {
    this.ensureStack();

    const toast = document.createElement("div");
    toast.classList.add("Notification");
    toast.innerHTML = `<span class="Notification_text">${html}</span>`;
    this.stack.appendChild(toast);

    //Fade/slide in on the next frame so the CSS transition has a start state to
    //animate from. Fall back to an immediate add when rAF isn't available.
    const raf = typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : cb => cb();
    raf(() => toast.classList.add("is-visible"));

    //Auto-dismiss: fade out, then remove once the transition has had time to run.
    const timer = typeof setTimeout === "function" ? setTimeout : cb => cb();
    timer(() => {
      toast.classList.remove("is-visible");
      timer(() => toast.remove(), 250);
    }, duration);
  }
}
