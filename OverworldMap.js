class OverworldMap {
    constructor(config) {
        this.gameObjects = config.gameObjects;
        this.walls = config.walls || {};

        // lower Images
        this.lowerImage = new Image();
        this.lowerImage.src = config.lowerSrc;

        //upper images
        this.upperImage = new Image();
        this.upperImage.src = config.upperSrc;

    }

    drawLowerImage(ctx, cameraPerson) {
        ctx.drawImage(
            this.lowerImage, 
            utils.withGrid(10.5) - cameraPerson.x, 
            utils.withGrid(6) - cameraPerson.y
            )
    }

    drawUpperImage(ctx, cameraPerson) {
        ctx.drawImage(
                this.upperImage, 
                utils.withGrid(10.5) - cameraPerson.x, 
                utils.withGrid(6) - cameraPerson.y
            )
    }

    isSpaceTaken(currentX, currentY, direction) {
        const {x,y} = utils.nextPosition(currentX, currentY, direction);
        return this.walls[`${x},${y}`] || false;
    }
    
    mountObjects() {
        Object.values(this.gameObjects).forEach(o => {

            //TODO: determine if this object should actually mount
            o.mount(this);

        })
    }

    addWall(x,y) {
        this.walls[`${x},${y}`] = true;
    }
    removeWall(x,y) {
        delete this.walls[`${x},${y}`]
    }
    moveWall(wasX, wasY, direction) {
        const nextPosition = utils.nextPosition(wasX, wasY, direction);
        const { x, y } = nextPosition;
        this.removeWall(wasX, wasY);
        this.addWall(x, y);
    
        // Check if the moveable character collides with any of the hitbox walls
       // Check if the moveable character collides with any of the hitbox walls
        const hitboxWalls1 = [
            utils.asGridCoord(25, 32), // Left side
            utils.asGridCoord(25, 34), // Right side
            utils.asGridCoord(26, 33), // Top side
            utils.asGridCoord(24, 33)  // Bottom side
        ];

        if (hitboxWalls1.includes(`${x},${y}`)) {
            // Redirect to test6.html
            window.location.href = "test6.html";
        }

        const hitboxWalls2 = [
            utils.asGridCoord(42, 39), // Left side
            utils.asGridCoord(43, 40), // Right side
            utils.asGridCoord(41, 40), // Top side
            utils.asGridCoord(42, 41)  // Bottom side
        ];

        if (hitboxWalls2.includes(`${x},${y}`)) {
            window.location.href = "test.html";
        }

    }
    

}

window.OverworldMaps = {
    DemoRoom: {
        lowerSrc: "/images/maps/DemoLower.png",
        upperSrc: "/images/maps/DemoUpper.png",
        gameObjects: {
          hero: new Person({
            isPlayerControlled: true,
            x: utils.withGrid(5),
            y: utils.withGrid(6),
          }),
          npc4: new Person({
            x: utils.withGrid(7),
            y: utils.withGrid(9),
            src: "/images/characters/people/npc4.png"
          })
        },
        walls: {
            [utils.asGridCoord(7,6)] : true,
            [utils.asGridCoord(8,6)] : true,
            [utils.asGridCoord(7,7)] : true,
            [utils.asGridCoord(8,7)] : true,
        }
    },
    Kitchen: {
        lowerSrc: "/images/maps/KitchenLower.png",
        upperSrc: "/images/maps/KitchenUpper.png",
        gameObjects: {
            hero: new Person({
                isPlayerControlled: true,
                x: utils.withGrid(4),
                y: utils.withGrid(9),
            }),
            npc1: new Person({
                isPlayerControlled: false,
                x: utils.withGrid(9),
                y: utils.withGrid(6),
                src: "/images/characters/people/npc1.png"
            })
        }
    },
    Jungle: {
        lowerSrc: "/images//biggerJungle.png",
        upperSrc: "/images/maps/KitchenUpper.png",
        gameObjects: {
            hero: new Person({
                isPlayerControlled: true,
                x: utils.withGrid(50),
                y: utils.withGrid(22),
            }),
            npc1: new Person({
                isPlayerControlled: false,
                x: utils.withGrid(40),
                y: utils.withGrid(30),
                src: "/images/characters/people/npc1.png"
            }),
            snake: new Person({
                isPlayerControlled: false,
                x: utils.withGrid(25),
                y: utils.withGrid(33),
                src: "/images/characters/people/snake.png"
            }),
            shop: new Person({
                isPlayerControlled: false,
                x: utils.withGrid(42),
                y: utils.withGrid(40),
                src: "/images/characters/people/teepee.png"
            })
        },
        walls: {
              
            [utils.asGridCoord(19,35)] : true,
            [utils.asGridCoord(19,36)] : true,
            [utils.asGridCoord(18,37)] : true,
            [utils.asGridCoord(17,38)] : true,
            [utils.asGridCoord(17,38)] : true,
            [utils.asGridCoord(17,38)] : true,
            [utils.asGridCoord(17,39)] : true,
            [utils.asGridCoord(17,40)] : true,
            [utils.asGridCoord(17,41)] : true,

            // here is above where character starts
            [utils.asGridCoord(19,34)] : true,
            [utils.asGridCoord(19,33)] : true,
           
            [utils.asGridCoord(15,31)] : true,
            [utils.asGridCoord(16,30)] : true,
            [utils.asGridCoord(16,32)] : true,
            [utils.asGridCoord(17,32)] : true,
            [utils.asGridCoord(18,32)] : true,
            [utils.asGridCoord(17,29)] : true,
            [utils.asGridCoord(18,30)] : true,
            [utils.asGridCoord(19,30)] : true,
            [utils.asGridCoord(20,30)] : true,
            [utils.asGridCoord(21,31)] : true,
            [utils.asGridCoord(21,32)] : true,
            [utils.asGridCoord(22,33)] : true,
            [utils.asGridCoord(23,32)] : true,
            [utils.asGridCoord(24,31)] : true,
            [utils.asGridCoord(25,30)] : true,
            [utils.asGridCoord(26,30)] : true,
            [utils.asGridCoord(27,30)] : true,
            [utils.asGridCoord(28,30)] : true,
            [utils.asGridCoord(29,29)] : true,
            [utils.asGridCoord(30,29)] : true,
            [utils.asGridCoord(31,29)] : true,
            [utils.asGridCoord(32,28)] : true,
            [utils.asGridCoord(33,27)] : true,
            [utils.asGridCoord(34,27)] : true,
            [utils.asGridCoord(35,27)] : true,
            [utils.asGridCoord(36,27)] : true,
            [utils.asGridCoord(37,27)] : true,
            [utils.asGridCoord(38,27)] : true,
            [utils.asGridCoord(39,26)] : true,
            [utils.asGridCoord(40,25)] : true,
            [utils.asGridCoord(41,24)] : true,
            [utils.asGridCoord(42,23)] : true,
            [utils.asGridCoord(43,23)] : true,
            [utils.asGridCoord(44,23)] : true,
            [utils.asGridCoord(45,23)] : true,
            [utils.asGridCoord(46,22)] : true,
            [utils.asGridCoord(47,22)] : true,
            [utils.asGridCoord(48,21)] : true,
            [utils.asGridCoord(49,21)] : true,
            [utils.asGridCoord(50,21)] : true,
            [utils.asGridCoord(50,20)] : true,
            [utils.asGridCoord(50,19)] : true,
            [utils.asGridCoord(51,19)] : true,
            [utils.asGridCoord(52,18)] : true,
            [utils.asGridCoord(53,17)] : true,
            [utils.asGridCoord(53,16)] : true,
            [utils.asGridCoord(52,15)] : true,
            [utils.asGridCoord(51,14)] : true,
            [utils.asGridCoord(51,13)] : true,
            [utils.asGridCoord(52,12)] : true,
            [utils.asGridCoord(53,12)] : true,
            [utils.asGridCoord(54,12)] : true,
            [utils.asGridCoord(55,12)] : true,
            [utils.asGridCoord(56,12)] : true,
            [utils.asGridCoord(57,12)] : true,
            [utils.asGridCoord(58,12)] : true,
            [utils.asGridCoord(59,12)] : true,
            [utils.asGridCoord(60,11)] : true,
            [utils.asGridCoord(61,11)] : true,
            [utils.asGridCoord(62,11)] : true,

            

            
        }
    },
}