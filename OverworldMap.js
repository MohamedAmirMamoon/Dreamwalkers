class OverworldMap {
    constructor(config) {
        this.gameObjects = config.gameObjects;
        this.walls = config.walls || {};

        // lower Images
        this.lowerImage = new Image();
        this.lowerImage.src = config.lowerSrc;

        // upper images
        this.upperImage = new Image();
        this.upperImage.src = config.upperSrc;

        this.loadGameState();
        

        // Pause menu
        this.isPaused = false;
        this.pauseMenu = document.createElement('div');
        this.pauseMenu.classList.add('pause-menu');
        this.createPauseMenu();
        document.body.appendChild(this.pauseMenu);

        // Bag menu
        this.bagMenu = document.createElement('div');
        this.bagMenu.classList.add('bag-menu');
        this.createBagMenu();
        document.body.appendChild(this.bagMenu);

        // Event listener to toggle pause menu when 'x' key is pressed
        window.addEventListener('keydown', (event) => {
            if (event.key === 'x') {
                this.togglePauseMenu();
            }
        });

        // Event listener to toggle bag menu when 'b' key is pressed
        window.addEventListener('keydown', (event) => {
            if (event.key === 'b') {
                this.toggleBagMenu();
            }
        });
    }

   displayBoughtItems() {
        // Retrieve the bag menu element
        const bagMenu = document.querySelector('.bag-menu');
    
        // Clear the current content of the bag menu
        bagMenu.querySelector('.bag-content').innerHTML = '';
    
        // Retrieve the bag items from localStorage
        const bagItems = JSON.parse(localStorage.getItem('bagItems')) || [];
    
        // Iterate over the bag items and add them to the bag menu
        bagItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('bag-item');
    
            const itemImage = document.createElement('img');
            itemImage.src = item.imagePath; // Assuming each item has an 'imagePath' property
            itemImage.alt = item.name; // Assuming each item has a 'name' property
            itemElement.appendChild(itemImage);
    
            const itemName = document.createElement('div');
            itemName.textContent = item.name;
            itemElement.appendChild(itemName);
    
            // Append the item element to the bag content
            bagMenu.querySelector('.bag-content').appendChild(itemElement);
        });
    }
    

    createPauseMenu() {
        // Create elements for pause menu
        const menuTitle = document.createElement('div');
        menuTitle.textContent = 'Paused';
        menuTitle.classList.add('menu-title');
    
        const resumeButton = document.createElement('button');
        resumeButton.textContent = 'Resume';
        resumeButton.classList.add('menu-button');
        resumeButton.addEventListener('click', () => this.togglePauseMenu());
    
        // Add Bag button
        const bagButton = document.createElement('button');
        bagButton.textContent = 'Bag';
        bagButton.classList.add('menu-button');
        bagButton.addEventListener('click', () => {
            // Redirect to bag.html
            window.location.href = 'bag.html';
        });
    
        // Append elements to pause menu
        this.pauseMenu.appendChild(menuTitle);
        this.pauseMenu.appendChild(resumeButton);
        this.pauseMenu.appendChild(bagButton);
    
        // Hide pause menu initially
        this.pauseMenu.style.display = 'none';
    }
    
createBagMenu() {
    const menuTitle = document.createElement('div');
    menuTitle.textContent = 'Bag';
    menuTitle.classList.add('menu-title');

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.classList.add('menu-button');
    closeButton.addEventListener('click', () => this.toggleBagMenu());

    // Bag content
    const bagContent = document.createElement('div');
    bagContent.classList.add('bag-content');

    // Populate bag content with items and their images
    const bagItems = JSON.parse(localStorage.getItem('bagItems')) || [];
    bagItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.classList.add('bag-item');

        const itemImage = document.createElement('img');
        itemImage.src = item.imagePath; // Assuming each item has an 'imagePath' property
        itemImage.alt = item.name; // Assuming each item has a 'name' property
        itemElement.appendChild(itemImage);

        const itemName = document.createElement('div');
        itemName.textContent = item.name;
        itemElement.appendChild(itemName);

        bagContent.appendChild(itemElement);
    });

    // Append elements to bag menu
    this.bagMenu.appendChild(menuTitle);
    this.bagMenu.appendChild(bagContent);
    this.bagMenu.appendChild(closeButton);

    // Hide bag menu initially
    this.bagMenu.style.display = 'none';
}

    

    togglePauseMenu() {
        // Toggle pause state
        this.isPaused = !this.isPaused;

        // Toggle display of pause menu
        if (this.isPaused) {
            this.pauseMenu.style.display = 'block';
        } else {
            this.pauseMenu.style.display = 'none';
        }
    }

    toggleBagMenu() {
        // Toggle display of bag menu
        const isBagMenuVisible = this.bagMenu.style.display === 'block';
        this.bagMenu.style.display = isBagMenuVisible ? 'none' : 'block';
    }

    loadGameState() {
        const gameStateJSON = localStorage.getItem('gameState');
        if (gameStateJSON) {
            const gameState = JSON.parse(gameStateJSON);
            // Restore game objects' positions and walls
            Object.keys(this.gameObjects).forEach(key => {
                const gameObject = this.gameObjects[key];
                gameObject.x = gameState.gameObjects[key].x;
                gameObject.y = gameState.gameObjects[key].y;
            });
        } else {
            // Reset walls to the initial state
            this.walls = { ...config.walls };
            // Save the initial state to local storage
            this.saveGameState();
        }
    }
    

    //Save the game state to localStorage
    saveGameState() {
        const gameState = {
        walls: this.walls,
        // Save positions of game objects
        gameObjects: {}
        };
    Object.keys(this.gameObjects).forEach(key => {
        const gameObject = this.gameObjects[key];
        gameState.gameObjects[key] = { x: gameObject.x, y: gameObject.y };
    });
    localStorage.setItem('gameState', JSON.stringify(gameState));
    }

    drawLowerImage(ctx, cameraPerson) {
        ctx.drawImage(
            this.lowerImage,
            utils.withGrid(10.5) - cameraPerson.x,
            utils.withGrid(6) - cameraPerson.y
        );
    }

    drawUpperImage(ctx, cameraPerson) {
        ctx.drawImage(
            this.upperImage,
            utils.withGrid(10.5) - cameraPerson.x,
            utils.withGrid(6) - cameraPerson.y
        );
    }

    isSpaceTaken(currentX, currentY, direction) {
        const { x, y } = utils.nextPosition(currentX, currentY, direction);
        return this.walls[`${x},${y}`] || false;
    }

    mountObjects() {
        Object.values(this.gameObjects).forEach(o => {
            // TODO: determine if this object should actually mount
            o.mount(this);
        });
    }

    addWall(x,y) {
        this.walls[`${x},${y}`] = false;
    }

    removeWall(x,y) {
        delete this.walls[`${x},${y}`]
    }

    moveWall(wasX, wasY, direction) {
        const nextPosition = utils.nextPosition(wasX, wasY, direction);
        const { x, y } = nextPosition;
        this.removeWall(wasX, wasY);
        this.addWall(x, y);
    
        // Check if the moved wall collides with any of the hitbox walls
        const hitboxWalls1 = [
            utils.asGridCoord(25, 32), // Left side
            utils.asGridCoord(25, 34), // Right side
            utils.asGridCoord(26, 33), // Top side
            utils.asGridCoord(24, 33)  // Bottom side
        ];
    
        if (hitboxWalls1.includes(`${x},${y}`)) {
            window.location.href = "test6.html";
            // Save the player's position when triggering the redirection
            this.gameObjects.hero.x = x;
            this.gameObjects.hero.y = y;
            this.saveGameState();
            return; // Exit the method early to prevent further execution
        }
    
        const hitboxWalls2 = [
            utils.asGridCoord(42, 39), // Left side
            utils.asGridCoord(43, 40), // Right side
            utils.asGridCoord(41, 40), // Top side
            utils.asGridCoord(42, 41)  // Bottom side
        ];
    
        if (hitboxWalls2.includes(`${x},${y}`)) {
            window.location.href = "test.html";
            // Save the player's position when triggering the redirection
            this.gameObjects.hero.x = x;
            this.gameObjects.hero.y = y;
            this.saveGameState();
            return; // Exit the method early to prevent further execution
        }
    }
}

// CSS for pause and bag menu styles
const menuStyles = `
.pause-menu, .bag-menu {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #7A1778; 
    padding: 20px;
    border-radius: 10px;
    text-align: center;
    width: 600px;
    height: 300px;
}

.menu-title {
    font-size: 50px;
    margin-bottom: 10px;
    color: white;
}

.menu-button {
    background-color: #560b54;
    color: #ffffff;
    padding: 15px 40px; 
    border: none;
    border-radius: 8px; /* Increase border radius for rounded corners */
    cursor: pointer;
    margin-top: 150px; 
    margin-bottom: 10px; 
    margin-left: 10px;

.menu-button:hover {
    background-color: #3b004b;
}



.bag-content {
    color: #fff;
}

.bag-menu {
    display: none;
    background-color: rgba(89, 0, 179, 1); 
    padding: 20px;
    border-radius: 10px;
    text-align: center;
    margin-top: 10px;
    border: 2px solid #fff;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    width: 600px;
    height: 450px;
}
`;

// Append styles to head
const styleElement = document.createElement('style');
styleElement.textContent = menuStyles;
document.head.appendChild(styleElement);

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
};