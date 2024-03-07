(function () {
    
    console.log("It's working!")
    const overworld = new Overworld({
        element: document.querySelector(".game-container")
    });
    overworld.init();

}) ();