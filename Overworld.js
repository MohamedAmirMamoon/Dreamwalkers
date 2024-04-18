class Overworld {

    constructor(config) {
        this.element = config.element;
        this.canvas = this.element.querySelector(".game-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.map = null;
    }

    startGameLoop() {
        const step = () => {

            // clear canvas here
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // establish camera person
            const cameraPerson = this.map.gameObjects.hero;

            //Update all objects
            Object.values(this.map.gameObjects).forEach(object => {
                object.update({
                arrow: this.directionInput.direction,
                map: this.map,
                })
            })

            // draw lower layer
            this.map.drawLowerImage(this.ctx, cameraPerson);

            //Draw Game Objects
            Object.values(this.map.gameObjects).forEach(object => {
                object.sprite.draw(this.ctx, cameraPerson);
            })

            // draw upper layer
            this.map.drawUpperImage(this.ctx, cameraPerson);

            requestAnimationFrame(() => {
                step();
            })
        }
        step();
    }

    init() {
        this.map = new OverworldMap(window.OverworldMaps.Jungle);
        this.map.mountObjects();

        this.directionInput = new DirectionInput();
        this.directionInput.init() 
        this.directionInput.direction;
        this.startGameLoop();

    }

}