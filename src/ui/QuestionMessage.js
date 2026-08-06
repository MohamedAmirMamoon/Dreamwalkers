import { KeyPressListener } from "../engine/KeyPressListener.js";

//A yes/no prompt built on the same dialogue box as TextMessage, with two
//buttons. Enter/Y confirm, Escape/N decline. onDecide(true|false) fires once,
//then the box removes itself.
export class QuestionMessage {
  constructor({ text, onDecide }) {
    this.text = text;
    this.onDecide = onDecide;
    this.element = null;
    this.decided = false;
  }

  createElement() {
    this.element = document.createElement("div");
    this.element.classList.add("QuestionMessage");
    this.element.innerHTML = `
      <p class="QuestionMessage_p">${this.text}</p>
      <div class="QuestionMessage_buttons">
        <button class="QuestionMessage_button" data-choice="yes">Yes</button>
        <button class="QuestionMessage_button" data-choice="no">No</button>
      </div>
    `;

    this.element.querySelectorAll("button").forEach(button => {
      button.addEventListener("click", () => this.decide(button.dataset.choice === "yes"));
    });

    this.yesListener = new KeyPressListener("KeyY", () => this.decide(true));
    this.noListener = new KeyPressListener("KeyN", () => this.decide(false));
    this.confirmListener = new KeyPressListener("Enter", () => this.decide(true));
    this.cancelListener = new KeyPressListener("Escape", () => this.decide(false));
  }

  decide(choice) {
    if (this.decided) {
      return;
    }
    this.decided = true;
    this.yesListener.unbind();
    this.noListener.unbind();
    this.confirmListener.unbind();
    this.cancelListener.unbind();
    this.element.remove();
    this.onDecide(choice);
  }

  init(container) {
    this.createElement();
    container.appendChild(this.element);
  }
}
