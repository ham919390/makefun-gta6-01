// Constants and content tables for Solmar Bay. Everything named here is original:
// the city, its districts, its people and its story were invented for this game.
export const WORLD = 2600; // city is WORLD x WORLD pixels
export const ROAD_GAP = 220; // distance between parallel streets
export const ROAD_W = 34; // street width
export const STEP = 1 / 60;

export const DISTRICTS = [
  { name: 'Marina', x: 0, y: 0, w: 560, h: 900, tint: '#2e6f8e' },
  { name: 'Old Town', x: 560, y: 0, w: 900, h: 900, tint: '#8a6f4d' },
  { name: 'Downtown', x: 1460, y: 0, w: 1140, h: 900, tint: '#4d5a7a' },
  { name: 'Market Row', x: 0, y: 900, w: 900, h: 800, tint: '#7a5a3d' },
  { name: 'Central Park', x: 900, y: 900, w: 700, h: 800, tint: '#3d6b3a' },
  { name: 'The Docks', x: 1600, y: 900, w: 1000, h: 800, tint: '#5a5a66' },
  { name: 'Sunset Hills', x: 0, y: 1700, w: 1300, h: 900, tint: '#a06a4d' },
  { name: 'Portside', x: 1300, y: 1700, w: 1300, h: 900, tint: '#4d6a72' },
];

export const CAR_COLORS = ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#2c3e50', '#8e44ad', '#16a085', '#e67e22', '#7f8c8d', '#d35400'];
export const CAR_MODELS = [
  { name: 'Sardine', top: 150, accel: 240 },
  { name: 'Comet GT', top: 340, accel: 320 },
  { name: 'Hauler', top: 190, accel: 200 },
  { name: 'Cruiser', top: 260, accel: 260 },
  { name: 'Vagabond', top: 300, accel: 290 },
];
export const PED_NAMES = ['Mara', 'Tomas', 'Lena', 'Ivo', 'Nadia', 'Kofi', 'Rosa', 'Dmitri', 'Aya', 'Bruno', 'Celia', 'Omar'];
export const WEAPONS = { pistol: { name: 'P9 Pistol', damage: 34, rate: 0.28, range: 420, ammo: 12 } };

// Six story missions for Rico Vale, a former courier pulled back into Solmar's
// underworld by his old friend Dario. Each mission is a list of steps the sim
// checks off in order; rewards are cash and respect.
export const MISSIONS = [
  {
    id: 1, title: 'First Wheels', giver: 'Dario',
    brief: 'Dario needs wheels. Borrow a car — any car — and bring it to the Marina garage.',
    reward: 250, steps: [
      { kind: 'enterCar', text: 'Get in a car (walk up to one and press E)' },
      { kind: 'goto', x: 330, y: 250, r: 90, text: 'Drive to the Marina garage' },
    ],
  },
  {
    id: 2, title: 'The Package', giver: 'Dario',
    brief: 'A package is waiting on the pier. Pick it up on foot and drop it at the Old Town garage.',
    reward: 400, steps: [
      { kind: 'goto', x: 210, y: 620, r: 70, text: 'Pick up the package on the pier' },
      { kind: 'goto', x: 900, y: 300, r: 90, text: 'Deliver it to the Old Town garage' },
    ],
  },
  {
    id: 3, title: 'Hot Pursuit', giver: 'Mira',
    brief: 'Mira tipped off the cops by accident. Lose the heat and reach the Sunset Hills safehouse.',
    reward: 600, steps: [
      { kind: 'heat', stars: 2, text: 'The police are on you — run!' },
      { kind: 'goto', x: 500, y: 2150, r: 100, text: 'Reach the Sunset Hills safehouse' },
      { kind: 'cool', text: 'Stay out of sight until the heat dies down' },
    ],
  },
  {
    id: 4, title: 'Dockside Trouble', giver: 'Dario',
    brief: 'The Kestrel crew seized the docks. Clear them out — four of them — and take the crates back.',
    reward: 900, steps: [
      { kind: 'goto', x: 2050, y: 1250, r: 120, text: 'Reach the docks' },
      { kind: 'defeat', count: 4, text: 'Deal with the Kestrel crew (4 left)' },
      { kind: 'goto', x: 2050, y: 1500, r: 90, text: 'Collect the crates' },
    ],
  },
  {
    id: 5, title: 'The Getaway', giver: 'Mira',
    brief: 'Grab the cash from the Downtown bank and get it to the Portside hideout before the cops box you in.',
    reward: 1400, steps: [
      { kind: 'goto', x: 1900, y: 450, r: 90, text: 'Reach the Downtown bank' },
      { kind: 'heat', stars: 3, text: 'Grab the cash — the alarm is up!' },
      { kind: 'goto', x: 1950, y: 2150, r: 100, text: 'Escape to the Portside hideout' },
    ],
  },
  {
    id: 6, title: 'The Big Score', giver: 'Dario',
    brief: 'One last job: haul the cargo from the Docks to the Marina before dawn. The whole city will be watching.',
    reward: 2500, steps: [
      { kind: 'goto', x: 2250, y: 1400, r: 100, text: 'Pick up the cargo at the Docks' },
      { kind: 'goto', x: 330, y: 700, r: 100, text: 'Deliver the cargo to the Marina — fast' },
    ],
  },
];

export const STORY_BEATS = [
  'Rico Vale drove courier vans for a living — until the night the Kestrel crew burned his route.',
  'Dario, his oldest friend, runs a garage in the Marina and still owes Rico a favour.',
  'Mira, a mechanic with a fast mouth and faster hands, keeps Rico\'s cars — and his plans — running.',
  'The Kestrel crew owns the Docks now. Rico intends to take them back, one job at a time.',
];
