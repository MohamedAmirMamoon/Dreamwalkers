import { utils } from "../engine/utils.js";
import { TWO_FRAME_ANIMATIONS } from "../engine/Sprite.js";
import { rect, line, border, compose, subtract, points, invert } from "../collision/walls.js";

//The jungle snake turns you back the moment you come within one tile of it,
//diagonals included. `face` is where the snake is from that tile, and `back` is
//the 3-step retreat. Each tile needs its own route: the trail is not a uniform
//corridor, and every step has to land on open path because these walks use
//retry:true and would spin forever against a wall.
const snakeBlock = (face, back) => [
  {
    events: [
      { who: "hero", type: "stand", direction: face, time: 200 },
      { type: "textMessage", text: "Hssss, sssoo sssHungry! You ssshall not passss!" },
      ...back.map(direction => ({ who: "hero", type: "walk", direction })),
      { who: "hero", type: "stand", direction: "left", time: 300 },
    ]
  }
];

//Routes for the escort cutscene, run-length encoded so a 39-step walk stays
//readable: "4l" is four steps left. u/d/l/r map to up/down/left/right.
const DIRECTIONS = { u: "up", d: "down", l: "left", r: "right" };
const route = encoded => encoded.split(" ").flatMap(token => {
  const count = Number(token.slice(0, -1));
  return Array(count).fill(DIRECTIONS[token.slice(-1)]);
});

//Walk two people to a destination together, one tile apart, by alternating
//their steps: the leader moves, then the follower steps into the tile the
//leader just left. That ordering matters. Every person occupies a wall, and
//cutscene walks use retry:true - so a follower who tried to enter a tile its
//leader still stood on would retry forever and hang the game outright.
//
//Both routes below were solved with a breadth-first search over the real wall
//data and then replayed through a simulation of the engine's own wall
//bookkeeping, confirming all 77 steps land on open path. Re-solve them (don't
//hand-edit) if the jungle terrain, Billy, or Ollie ever move.
const escort = (leader, leaderRoute, follower, followerRoute) => {
  const lead = route(leaderRoute);
  const trail = route(followerRoute);
  const steps = [];
  for (let i = 0; i < Math.max(lead.length, trail.length); i++) {
    if (i < lead.length) {
      steps.push({ who: leader, type: "walk", direction: lead[i] });
    }
    if (i < trail.length) {
      steps.push({ who: follower, type: "walk", direction: trail[i] });
    }
  }
  return steps;
};

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
              //Looking around for the way out: left, right, left, then back to
              //facing you. Never "up" - that row of his sheet is the back of his
              //head, and the loop should always read as him searching.
              behaviorLoop: [
                { type: "stand",  direction: "left",  time: 900 },
                { type: "stand",  direction: "right", time: 900 },
                { type: "stand",  direction: "left",  time: 900 },
                { type: "stand",  direction: "down",  time: 1200 },
              ],
              talking: [
                {
                  events: [
                    { type: "textMessage", text: "aah im lost... where do i go!", faceHero: "billy" },
                    { type: "textMessage", text: "i wonder where my otter went?" },
                  ]
                }
              ]
          },
          Ollie: {
            type: "Person",
            isPlayerControlled: false,
            //The dead-end pocket at the far east end of the trail, reachable
            //only from (70,27). Sitting in a dead end is deliberate: it means
            //the hero can only ever talk to Ollie while standing on (70,27),
            //so the escort cutscene below has exactly one starting layout to
            //solve for instead of four.
            x: utils.withGrid(71),
            y: utils.withGrid(27),
            //Facing back down the path, so he's looking at you as you arrive.
            direction: "left",
            src: "/images/characters/people/ollieOtter.png",
            behaviorLoop: [
              { type: "stand",  direction: "left",  time: 1400 },
              { type: "stand",  direction: "up",    time: 700 },
              { type: "stand",  direction: "left",  time: 900 },
              { type: "stand",  direction: "down",  time: 700 },
            ],
            talking: [
              {
                //oneShot: the routes below are solved for one exact starting
                //layout (Ollie in the pocket, hero on (70,27)). Replaying it
                //from anywhere else walks someone into a wall, and a retry:true
                //walk against a wall hangs the game for good.
                oneShot: true,
                events: [
                  { type: "textMessage", text: "Ollie: There you are! I've been waiting ages.", faceHero: "Ollie" },
                  { type: "textMessage", text: "Ollie: Come on - Billy must be worried sick. Follow me!" },
                  //Hero steps west out of the way first: Ollie's only exit from
                  //the pocket is through (70,27), which is where the hero is
                  //standing to have this conversation.
                  { who: "hero", type: "walk", direction: "left" },
                  ...escort(
                    "Ollie", "1l 1u 4l 1d 5l 2d 5l 2d 4l 1d 8l 1u 2l 1u 1l",
                    "hero",  "1u 3l 1d 5l 2d 5l 2d 4l 1d 8l 1u 4l",
                  ),
                  //Ollie ends on Billy's right at (41,30) and turns to him; the
                  //hero ends in front of Billy at (40,31) and looks up at him.
                  { who: "Ollie", type: "stand", direction: "left", time: 400 },
                  { who: "hero",  type: "stand", direction: "up",   time: 500 },
                  { who: "billy", type: "stand", direction: "down", time: 400 },
                  { type: "textMessage", text: "oh my gosh, THANK YOU for finding Ollie, I've been looking everywhere for him! :D" },
                ]
              },
              //Falls through to this once the escort above has played, so
              //talking to Ollie again is a normal chat instead of a re-run.
              {
                events: [
                  { type: "textMessage", text: "Ollie: Much better with a friend around, huh?", faceHero: "Ollie" },
                ]
              }
            ]
          },
          snake: {
            type: "Person",
            isPlayerControlled: false,
            //Column 28 (rows 31-32) is the ONLY link between the spawn side of
            //the trail and the 86 tiles to the west, so the snake is posted
            //there to gate the forest. Its own tile becomes a wall on mount,
            //sealing row 31; the one remaining gap, (28,32), is guarded by the
            //blockedPath cutscene below.
            x: utils.withGrid(28),
            y: utils.withGrid(31),
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
            //Stops at 70: (71,26) is foliage in the art, not dirt. The pixel
            //trace counted it as path because the tree canopy there is only
            //19% brown, and leaving it walkable would let you stand in a bush
            //AND give Ollie's nook a second entrance (see (71,27) below).
            line(59,26,70,26),
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
            //(70,28) removed: 16% dirt, so it's foliage the trace misread.
            //Sealing it (with (71,26) above) makes (71,27) a genuine dead end
            //reachable only from (70,27). Ollie sits in it, so when you talk to
            //him the hero can only ever be standing on (70,27) - which is what
            //lets the walk-to-Billy cutscene use one fixed, pre-verified route.
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
        //The snake blocks the only way west, and it turns you back from any tile
        //touching it - orthogonally or diagonally. Every guarded tile talks, then
        //shoves the hero 3 tiles back to somewhere outside the ring, so the next
        //approach re-triggers cleanly. None of these are oneShot: they repeat on
        //every attempt until the snake is dealt with.
        //TODO: the "do something" that gets you past it isn't written yet; when
        //it is, it should stop these spaces from firing.
        //
        //Only the tiles reachable from the hero's side are listed. The three
        //ring tiles west of the snake - (27,30), (27,31), (27,32) - are sealed
        //off behind it, and an east pushback from there would walk straight into
        //the snake's own wall and retry forever.
        [utils.asGridCoord(28,32)]: snakeBlock("up",   ["right","right","right"]),
        [utils.asGridCoord(29,31)]: snakeBlock("left", ["right","right","right"]),
        [utils.asGridCoord(29,30)]: snakeBlock("left", ["right","right","right"]),
        //Row 32 dead-ends at col 31, so this one veers up on its last step
        //instead of walking into the wall at (32,32).
        [utils.asGridCoord(29,32)]: snakeBlock("left", ["right","right","up"]),
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
          //Pottering about on the sand. Deliberately a CLOSED circuit - the same
          //number of steps right as left - so he always returns to (14,20) and
          //never drifts into the tiles the intro cutscene walks the hero through.
          //A drifting NPC parked on that route would block a retry:true walk and
          //hang the intro forever. He also never steps left of (14,20): (13,20)
          //is a wall, and a blocked behavior-loop walk retries for good.
          behaviorLoop: [
            { type: "stand",  direction: "down",  time: 1100 },
            { type: "walk",   direction: "right" },
            { type: "stand",  direction: "down",  time: 900 },
            { type: "walk",   direction: "right" },
            { type: "stand",  direction: "left",  time: 800 },
            { type: "walk",   direction: "left" },
            { type: "stand",  direction: "down",  time: 900 },
            { type: "walk",   direction: "left" },
          ],
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
