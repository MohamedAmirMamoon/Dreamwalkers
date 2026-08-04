import "./styles/global.css";
import "./styles/TextMessage.css";
import "./styles/SceneTransition.css";

import { Overworld } from "./engine/Overworld.js";

(function () {

    const overworld = new Overworld({
        element: document.querySelector(".game-container")
    });
    overworld.init();

    //Handy for debugging in the console (and for driving the game from tests).
    if (import.meta.env.DEV) {
        window.overworld = overworld;
    }

}) ();