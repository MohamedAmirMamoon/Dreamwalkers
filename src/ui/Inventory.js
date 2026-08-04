import { KeyPressListener } from "../engine/KeyPressListener.js";

//A small backpack button pinned to the top-right of the game screen, plus the
//popout panel it opens. Click the bag or press Ctrl+B to toggle the panel; the
//same key or the panel's close button shuts it. While the panel is open the
//overworld freezes input (see Overworld.isInventoryOpen) so the hero can't
//wander off underneath it.
export class Inventory {
  constructor({ container, items, onOpenChange }) {
    this.container = container;
    //Placeholder starting items. Swap for real game state whenever the
    //inventory system grows past "look at it".
    this.items = items || [
      { icon: "🌙", name: "Dream Shard", count: 3 },
      { icon: "🗝️", name: "Rusty Key", count: 1 },
      { icon: "🍎", name: "Apple", count: 2 },
    ];
    this.onOpenChange = onOpenChange || (() => {});
    this.isOpen = false;
    this.button = null;
    this.panel = null;
  }

  createElement() {
    //The backpack button.
    this.button = document.createElement("button");
    this.button.classList.add("Inventory_button");
    this.button.setAttribute("aria-label", "Open inventory");
    this.button.innerHTML = `<img src="/images/ui/backpack.png" alt="" draggable="false" />`;
    this.button.addEventListener("click", () => this.toggle());

    //The popout panel, built once and shown/hidden by a class.
    this.panel = document.createElement("div");
    this.panel.classList.add("Inventory_panel");
    this.panel.hidden = true;
    this.panel.innerHTML = `
      <div class="Inventory_header">
        <span class="Inventory_title">Backpack</span>
        <button class="Inventory_close" aria-label="Close inventory">✕</button>
      </div>
      <ul class="Inventory_list">
        ${this.renderItems()}
      </ul>
    `;
    this.panel.querySelector(".Inventory_close")
      .addEventListener("click", () => this.close());
  }

  renderItems() {
    if (!this.items.length) {
      return `<li class="Inventory_empty">Your backpack is empty.</li>`;
    }
    return this.items.map(item => `
      <li class="Inventory_item">
        <span class="Inventory_icon">${item.icon}</span>
        <span class="Inventory_name">${item.name}</span>
        <span class="Inventory_count">×${item.count}</span>
      </li>
    `).join("");
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    if (this.isOpen) {
      return;
    }
    this.isOpen = true;
    this.panel.hidden = false;
    this.button.classList.add("is-open");
    this.onOpenChange(true);
  }

  close() {
    if (!this.isOpen) {
      return;
    }
    this.isOpen = false;
    this.panel.hidden = true;
    this.button.classList.remove("is-open");
    this.onOpenChange(false);
  }

  init() {
    this.createElement();
    this.container.appendChild(this.button);
    this.container.appendChild(this.panel);

    //Ctrl+B toggles the bag. KeyPressListener only checks the key code, so the
    //Ctrl guard lives here - a bare "B" would fire while walking.
    this.keyListener = new KeyPressListener("KeyB", event => {
      if (event && event.ctrlKey) {
        this.toggle();
      }
    });
  }
}
