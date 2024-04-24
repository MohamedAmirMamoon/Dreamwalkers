class OverworldMap {
    constructor(config) {
      this.overworld = null;
      this.gameObjects = config.gameObjects;
      this.cutsceneSpaces = config.cutsceneSpaces || {};
      this.walls = config.walls || {};
  
      this.lowerImage = new Image();
      this.lowerImage.src = config.lowerSrc;
  
      this.upperImage = new Image();
      this.upperImage.src = config.upperSrc;
  
      this.isCutscenePlaying = false;
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
      Object.keys(this.gameObjects).forEach(key => {
  
        let object = this.gameObjects[key];
        object.id = key;
  
        //TODO: determine if this object should actually mount
        object.mount(this);
  
      })
    }
  
    async startCutscene(events) {
      this.isCutscenePlaying = true;
  
      for (let i=0; i<events.length; i++) {
        const eventHandler = new OverworldEvent({
          event: events[i],
          map: this,
        })
        await eventHandler.init();
      }
  
      this.isCutscenePlaying = false;
  
      //Reset NPCs to do their idle behavior
      Object.values(this.gameObjects).forEach(object => object.doBehaviorEvent(this))
    }
  
    checkForActionCutscene() {
      const hero = this.gameObjects["hero"];
      const nextCoords = utils.nextPosition(hero.x, hero.y, hero.direction);
      const match = Object.values(this.gameObjects).find(object => {
        return `${object.x},${object.y}` === `${nextCoords.x},${nextCoords.y}`
      });
      if (!this.isCutscenePlaying && match && match.talking.length) {
        this.startCutscene(match.talking[0].events)
      }
    }
  
    checkForFootstepCutscene() {
      const hero = this.gameObjects["hero"];
      const match = this.cutsceneSpaces[ `${hero.x},${hero.y}` ];
      if (!this.isCutscenePlaying && match) {
        this.startCutscene( match[0].events )
      }
    }
  
    addWall(x,y) {
      this.walls[`${x},${y}`] = true;
    }
    removeWall(x,y) {
      delete this.walls[`${x},${y}`]
    }
    moveWall(wasX, wasY, direction) {
      this.removeWall(wasX, wasY);
      const {x,y} = utils.nextPosition(wasX, wasY, direction);
      this.addWall(x,y);
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
        npcA: new Person({
          x: utils.withGrid(7),
          y: utils.withGrid(9),
          src: "/images/characters/people/npc1.png",
          behaviorLoop: [
            { type: "stand",  direction: "left", time: 800 },
            { type: "stand",  direction: "up", time: 800 },
            { type: "stand",  direction: "right", time: 1200 },
            { type: "stand",  direction: "up", time: 300 },
          ],
          talking: [
            {
              events: [
                { type: "textMessage", text: "I'm busy...", faceHero: "npcA" },
                { type: "textMessage", text: "Go away!"},
                { who: "hero", type: "walk",  direction: "up" },
              ]
            }
          ]
        }),
        npcB: new Person({
          x: utils.withGrid(8),
          y: utils.withGrid(5),
          src: "/images/characters/people/npc2.png",
          // behaviorLoop: [
          //   { type: "walk",  direction: "left" },
          //   { type: "stand",  direction: "up", time: 800 },
          //   { type: "walk",  direction: "up" },
          //   { type: "walk",  direction: "right" },
          //   { type: "walk",  direction: "down" },
          // ]
        }),
      },
      walls: {
        [utils.asGridCoord(7,6)] : true,
        [utils.asGridCoord(8,6)] : true,
        [utils.asGridCoord(7,7)] : true,
        [utils.asGridCoord(8,7)] : true,
      },
      cutsceneSpaces: {
        [utils.asGridCoord(7,4)]: [
          {
            events: [
              { who: "npcB", type: "walk",  direction: "left" },
              { who: "npcB", type: "stand",  direction: "up", time: 500 },
              { type: "textMessage", text:"You can't be in there!"},
              { who: "npcB", type: "walk",  direction: "right" },
              { who: "hero", type: "walk",  direction: "down" },
              { who: "hero", type: "walk",  direction: "left" },
            ]
          }
        ],
        [utils.asGridCoord(5,10)]: [
          {
            events: [
              { type: "changeMap", map: "Jungle" }
            ]
          }
        ]
      }
      
    },
    Kitchen: {
      lowerSrc: "/images/maps/KitchenLower.png",
      upperSrc: "/images/maps/KitchenUpper.png",
      gameObjects: {
        hero: new Person({
          isPlayerControlled: true,
          x: utils.withGrid(5),
          y: utils.withGrid(5),
        }),
        npcB: new Person({
          x: utils.withGrid(10),
          y: utils.withGrid(8),
          src: "/images/characters/people/npc3.png",
          talking: [
            {
              events: [
                { type: "textMessage", text: "You made it!", faceHero:"npcB" },
              ]
            }
          ]
        })
      }
    },

    Bedroom: {
      lowerSrc: "/images/maps/bedroom_v2.png",
      upperSrc: "",

      gameObjects: {
        hero: new Person({
          isPlayerControlled: true,
          x: utils.withGrid(17),
          y: utils.withGrid(10),
        }),
        dreamkeeper: new Person({
          x: utils.withGrid(10),
          y: utils.withGrid(8),
          src: "/images/characters/people/npc3.png",
          behaviorLoop: [
            { type: "stand",  direction: "left", time: 800 },
            { type: "stand",  direction: "up", time: 800 },
            { type: "stand",  direction: "right", time: 1200 },
            { type: "stand",  direction: "up", time: 300 },
          ],
          talking: [
            {
              events: [
                { type: "textMessage", text: "Not leaving you, until you're asleep!", faceHero: "dreamkeeper" },
                { type: "textMessage", text: "Go to Bed!"},
              ]
            }
          ]
        })
      },

      cutsceneSpaces: {
        [utils.asGridCoord(2,6)]: [
          {
            events: [
              { type: "changeMap", map: "Beach" }
            ]
          }
        ]
      }
    },
  
    Jungle: {
      lowerSrc: "/images//biggerJungle.png",
      upperSrc: "/images/maps/KitchenUpper.png",

      gameObjects: {
          hero: new Person({
              isPlayerControlled: true,
              x: utils.withGrid(29),
              y: utils.withGrid(32),
          }),
          billy: new Person({
              isPlayerControlled: false,
              x: utils.withGrid(40),
              y: utils.withGrid(30),
              src: "/images/characters/people/billy.png"
          }),
          snake: new Person({
            isPlayerControlled: false,
            x: utils.withGrid(25),
            y: utils.withGrid(33),
            src: "/images/characters/people/snake.png"
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
  
          
  
          
      },

      cutsceneSpaces: {
        [utils.asGridCoord(2,6)]: [
          {
            events: [
              { type: "changeMap", map: "Bedroom" }
            ]
          }
        ],
        [utils.asGridCoord(27,31)]: [
          {
            events: [
              { who: "snake", type: "walk",  direction: "up" },
              { who: "snake", type: "walk",  direction: "down" },
              { type: "textMessage", text:"Hssss, sssoo sssHungry!"},
            ]
          }
        ],
        [utils.asGridCoord(27,32)]: [
          {
            events: [
              { who: "snake", type: "walk",  direction: "up" },
              { who: "snake", type: "walk",  direction: "down" },
              { type: "textMessage", text:"Hssss, sssoo sssHungry!"},
            ]
          }
        ],
        [utils.asGridCoord(27,33)]: [
          {
            events: [
              { who: "snake", type: "walk",  direction: "up" },
              { who: "snake", type: "walk",  direction: "down" },
              { type: "textMessage", text:"Hssss, sssoo sssHungry!"},
            ]
          }
        ],
      },
      
    },
    Beach: {
      lowerSrc: "/images/maps/beach.png",
      upperSrc: "",

      gameObjects: {
        hero: new Person({
          isPlayerControlled: true,
          x: utils.withGrid(12),
          y: utils.withGrid(32),
        }),
        Ollie: new Person({
          x: utils.withGrid(14),
          y: utils.withGrid(20),
          src: "/images/characters/people/ollieOtter.png",
          talking: [
            {
              events: [
                { type: "textMessage", text: "You made it!", faceHero:"npcB" },
              ]
            }
          ]
        })
      },

      cutsceneSpaces: {
        [utils.asGridCoord(12,19)]: [
          {
            events: [
              { type: "changeMap", map: "Jungle" }
            ]
            
          }
        ],

        [utils.asGridCoord(12,31)]: [
          {
            events: [
              { who: "Ollie", type: "walk",  direction: "down" },
              { who: "Ollie", type: "walk",  direction: "down" },
              { who: "Ollie", type: "walk",  direction: "down" },
              { who: "Ollie", type: "walk",  direction: "down" },
              { who: "Ollie", type: "walk",  direction: "down" },
              { who: "Ollie", type: "walk",  direction: "down" },
              { who: "Ollie", type: "walk",  direction: "down" },
              { who: "Ollie", type: "walk",  direction: "down" },
              { who: "Ollie", type: "walk",  direction: "down" },
              { who: "Ollie", type: "walk",  direction: "down" },
              { who: "Ollie", type: "walk",  direction: "down" },
              
              { who: "Ollie", type: "stand",  direction: "up", time: 500 },
              { who: "hero", type: "stand",  direction: "right"},
              { type: "textMessage", text:"Ollie: Oh hey, there you are! I’ve heard about you!"},
              { type: "textMessage", text:"Ollie: Dante, right?"},
              { type: "textMessage", text:"Ollie: Oh, you’re wondering where you are…"},
              { who: "Ollie", type: "stand",  direction: "right", time: 1000 },
              { who: "Ollie", type: "stand",  direction: "left", time: 1000 },

              { type: "textMessage", text:"Ollie: On a beach? Is that a good answer? Maybe not…"},

              { who: "Ollie", type: "stand",  direction: "right", time: 200 },
              { who: "hero", type: "stand",  direction: "left", time: 200 },
              { who: "Ollie", type: "stand",  direction: "left", time: 200 },
              { who: "hero", type: "stand",  direction: "right", time: 200 },
              { who: "Ollie", type: "stand",  direction: "right", time: 200 },
              { who: "hero", type: "stand",  direction: "left", time: 200 },
              { who: "Ollie", type: "stand",  direction: "left", time: 200 },
              { who: "hero", type: "stand",  direction: "right", time: 200 },

              { type: "textMessage", text:"Ollie: Uhoh.. That must mean it’s time."},
              { type: "textMessage", text:"Ollie: “Time for what?”"},

              { type: "textMessage", text:"Ollie: Hmm..."},
              { type: "textMessage", text:"Ollie: Maybe it's better if you just follow me."},

              
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },

              { who: "hero", type: "walk",  direction: "right" },
              { who: "hero", type: "walk",  direction: "right" },

              { who: "hero", type: "walk",  direction: "up" },
              { who: "hero", type: "walk",  direction: "up" },
              { who: "hero", type: "walk",  direction: "up" },
              { who: "hero", type: "walk",  direction: "up" },
              { who: "hero", type: "walk",  direction: "up" },

              
              { who: "hero", type: "walk",  direction: "left" },
              { who: "hero", type: "walk",  direction: "left" },

              { who: "hero", type: "walk",  direction: "up" },
              { who: "hero", type: "walk",  direction: "up" },
              { who: "hero", type: "walk",  direction: "up" },
              { who: "hero", type: "walk",  direction: "up" },
              { who: "hero", type: "walk",  direction: "up" },
              { who: "hero", type: "walk",  direction: "up" },
              { who: "hero", type: "stand",  direction: "right"},


              { who: "Ollie", type: "stand",  direction: "left" },
              { type: "textMessage", text:"Ollie: Quickly, go into the water."},


              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
              { who: "Ollie", type: "walk",  direction: "up" },
            ]
          }
        ],
        

      },
      walls: {
        [utils.asGridCoord(11,32)] : true,
        [utils.asGridCoord(13,32)] : true,
        [utils.asGridCoord(12,33)] : true,
        [utils.asGridCoord(13,20)] : true,
        [utils.asGridCoord(11,20)] : true,
      },
    },
    
  }