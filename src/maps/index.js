import { utils } from "../engine/utils.js";
import { TWO_FRAME_ANIMATIONS } from "../engine/Sprite.js";
import { rect, line, border, compose, subtract, points, invert } from "../collision/walls.js";

//Map entries are pure data blueprints. Nothing in here is a live game object:
//OverworldMap instantiates a fresh set of game objects and copies the walls
//every time a map is mounted, so leaving and re-entering a map always replays
//the authored spawn points / behavior loops / wall layout.
export const OverworldMaps = {
    DemoRoom: {
      lowerSrc: "/images/maps/DemoLower.png",
      upperSrc: "/images/maps/DemoUpper.png",
      gameObjects: {
        hero: {
          type: "Person",
          isPlayerControlled: true,
          x: utils.withGrid(5),
          y: utils.withGrid(6),
        },
        npcA: {
          type: "Person",
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
        },
        npcB: {
          type: "Person",
          x: utils.withGrid(8),
          y: utils.withGrid(5),
          src: "/images/characters/people/npc2.png",
        },
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
        hero: {
          type: "Person",
          isPlayerControlled: true,
          x: utils.withGrid(5),
          y: utils.withGrid(5),
        },
        npcB: {
          type: "Person",
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
        }
      }
    },

    Bedroom: {
      lowerSrc: "/images/maps/bedroom_v2.png",

      gameObjects: {
        hero: {
          type: "Person",
          isPlayerControlled: true,
          x: utils.withGrid(17),
          y: utils.withGrid(10),
        },
        dreamkeeper: {
          type: "Person",
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
        }
      },

      // Bedroom is 22x12 tiles (352x198px — exactly one screen).
      // Top half (rows 0-5) is the back wall + furniture.
      // Right panel (rows 6-9, cols 13-21) is a raised accent wall with pictures.
      // Bed frame legs extend into rows 6-7 at cols 0-2.
      // Exit is at (2,6) — foot of the bed (go to sleep → dream transition).
      // Out-of-bounds rows/cols seal the perimeter so the hero can't walk off-screen.
      walls: compose(
        rect(0, 0, 21, 5),         // entire back wall + furniture (top half)
        rect(13, 6, 21, 9),        // right accent wall panel
        points([[0,6],[1,6]]),      // bed frame (col 2 row 6 left open — it's the exit)
        points([[0,7],[1,7],[2,7]]),// bed frame lower
        line(-1, 0, -1, 12),       // left boundary (off-screen)
        line(22, 0, 22, 12),       // right boundary (off-screen)
        line(0, -1, 21, -1),       // top boundary (off-screen)
        line(0, 12, 21, 12),       // bottom boundary (off-screen)
      ),

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
      lowerSrc: "/images/biggerJungle.png",

      gameObjects: {
          hero: {
              type: "Person",
              isPlayerControlled: true,
              x: utils.withGrid(29),
              y: utils.withGrid(32),
          },
          billy: {
              type: "Person",
              isPlayerControlled: false,
              x: utils.withGrid(40),
              y: utils.withGrid(30),
              //Face the camera so you see his front, not the back of his head.
              direction: "down",
              src: "/images/characters/people/billy.png",
              talking: [
                {
                  events: [
                    { type: "textMessage", text: "aah im lost... where do i go!", faceHero: "billy" },
                  ]
                }
              ]
          },
          snake: {
            type: "Person",
            isPlayerControlled: false,
            x: utils.withGrid(25),
            y: utils.withGrid(33),
            src: "/images/characters/people/snake.png",
            //snake.png is 64x32 - two 32x32 frames, not the usual 4x4 sheet
            animations: TWO_FRAME_ANIMATIONS,
          }
      },
      // biggerJungle.png is 1440x912 = 90x57 tiles: a dense forest with one
      // dirt path winding through it. The path is the only walkable surface,
      // so we describe the path (below) and wall EVERYTHING else with invert().
      // Walkable tiles were traced from the art by pixel analysis (brown dirt
      // vs green foliage), flood-filled from the hero spawn, then bridged at
      // the diagonal bends so the whole trail is reachable with 4-directional
      // movement. 430 walkable tiles. See scripts/traceJungle.mjs.
      walls: invert(
        compose(
            line(59,10,62,10),
            line(50,11,50,11),
            line(59,11,61,11),
            line(49,12,51,12),
            line(55,12,55,12),
            line(61,12,62,12),
            line(49,13,49,13),
            line(51,13,62,13),
            line(51,14,61,14),
            line(53,15,61,15),
            line(53,16,57,16),
            line(54,17,57,17),
            line(53,18,57,18),
            line(52,19,56,19),
            line(49,20,49,20),
            line(51,20,54,20),
            line(56,20,56,20),
            line(67,20,67,20),
            line(48,21,54,21),
            line(67,21,70,21),
            line(51,22,53,22),
            line(63,22,63,22),
            line(68,22,71,22),
            line(73,22,73,22),
            line(48,23,53,23),
            line(63,23,64,23),
            line(69,23,74,23),
            line(37,24,38,24),
            line(40,24,40,24),
            line(48,24,49,24),
            line(52,24,52,24),
            line(63,24,65,24),
            line(69,24,72,24),
            line(36,25,48,25),
            line(60,25,61,25),
            line(63,25,71,25),
            line(33,26,34,26),
            line(40,26,43,26),
            line(47,26,48,26),
            line(59,26,71,26),
            line(15,27,18,27),
            line(29,27,30,27),
            line(33,27,35,27),
            line(39,27,42,27),
            line(53,27,54,27),
            line(60,27,66,27),
            line(68,27,71,27),
            line(15,28,18,28),
            line(29,28,31,28),
            line(33,28,42,28),
            line(53,28,61,28),
            line(70,28,70,28),
            line(17,29,18,29),
            line(26,29,26,29),
            line(29,29,42,29),
            line(50,29,50,29),
            line(54,29,61,29),
            line(17,30,18,30),
            line(25,30,27,30),
            line(29,30,36,30),
            line(38,30,42,30),
            line(49,30,51,30),
            line(53,30,56,30),
            line(16,31,20,31),
            line(22,31,22,31),
            line(25,31,32,31),
            line(39,31,44,31),
            line(46,31,46,31),
            line(49,31,56,31),
            line(19,32,31,32),
            line(40,32,52,32),
            line(20,33,21,33),
            line(23,33,27,33),
            line(41,33,45,33),
            line(47,33,51,33),
            line(19,34,27,34),
            line(43,34,51,34),
            line(17,35,23,35),
            line(43,35,47,35),
            line(16,36,18,36),
            line(20,36,23,36),
            line(44,36,47,36),
            line(19,37,23,37),
            line(43,37,47,37),
            line(17,38,22,38),
            line(42,38,46,38),
            line(17,39,20,39),
            line(22,39,22,39),
            line(39,39,39,39),
            line(41,39,44,39),
            line(46,39,46,39),
            line(17,40,20,40),
            line(38,40,44,40),
            line(18,41,19,41),
            line(41,41,43,41),
        ),
        90, 57,
      ),

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

      gameObjects: {
        hero: {
          type: "Person",
          isPlayerControlled: true,
          x: utils.withGrid(12),
          y: utils.withGrid(32),
        },
        Ollie: {
          type: "Person",
          x: utils.withGrid(14),
          y: utils.withGrid(20),
          src: "/images/characters/people/ollieOtter.png",
          talking: [
            {
              events: [
                { type: "textMessage", text: "You made it!", faceHero:"Ollie" },
              ]
            }
          ]
        }
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
            //The intro only makes sense the first time you walk up the beach
            oneShot: true,
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
