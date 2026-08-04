import "./styles/global.css";
import "./styles/TextMessage.css";

import { Overworld } from "./engine/Overworld.js";

(function () {

    const overworld = new Overworld({
        element: document.querySelector(".game-container")
    });
    overworld.init();

}) ();