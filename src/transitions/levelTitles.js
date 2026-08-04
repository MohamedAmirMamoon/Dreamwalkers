//Display names shown on the title card during a level transition.
//Keyed by map id. Rename these freely - nothing else depends on the wording.
export const LEVEL_TITLES = {
  Bedroom:  { title: "Dante's Room",   subtitle: "The Waking World" },
  Beach:    { title: "Sunken Shore",   subtitle: "Shores of Sleep" },
  Jungle:   { title: "Verdant Hollow", subtitle: "Deeper Still" },
  Kitchen:  { title: "The Kitchen",    subtitle: null },
  DemoRoom: { title: "Demo Room",      subtitle: null },
};

export function getLevelTitle(mapId) {
  return LEVEL_TITLES[mapId] || { title: mapId, subtitle: null };
}
