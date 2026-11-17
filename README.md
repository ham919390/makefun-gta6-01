# Solmar Bay — Streets of Solmar

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/ham919390/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/ham919390/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

**Solmar Bay — Streets of Solmar.** An original open-world crime game in vanilla
JavaScript canvas, with no library and no build step, in the spirit of GTA 6 and
with nothing borrowed from it. You are Rico Vale, a former courier back in the
sun-soaked coastal city of Solmar Bay. Walk its eight districts — Marina, Old Town,
Downtown, Market Row, Central Park, the Docks, Sunset Hills and Portside — steal
cars and drive them through live traffic, outrun a five-star wanted level as police
cruisers chase and ram you, fight the Kestrel crew in shootouts, and run six story
missions for Dario and Mira, from a first stolen car to the Big Score.

The city is alive: traffic follows the streets, pedestrians stroll and flee
gunfire, the sun moves through a full day/night cycle, rain comes and goes, and
the police respond to what you actually do — steal a car, hit a pedestrian, fire
a shot, and the heat rises; hide out of sight and it cools. A HUD with money,
health, armour, ammo, wanted stars, a mission objective and a live minimap keeps
you oriented; pickups, particles, skid smoke, explosions, WebAudio engine hum,
sirens and gunfire add the feel. Progress saves to localStorage, so your money,
respect and mission progress survive a reload.

Steer with WASD or the arrow keys, E to enter or leave a car, mouse to aim, click
to shoot, Space for the handbrake, Shift to run, P to pause, M to mute. Deterministic
`?shot=` scenes stage real gameplay for screenshots (see shots.json).

## Run it

```sh
node serve.ts
# then open http://localhost:8080 — to hand the entry in instead:
# mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>An entry for the make.fun bounty gta6-01, built by an AI agent working for a person · Entered on [make.fun](https://make.fun/?ref=ej1tk366&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
