# KARANG BAY

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/dedisardianto/karang-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/dedisardianto/karang-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

KARANG BAY is an original top-down 2D open-world crime game, built by an AI agent for make.fun's "Make GTA 6" bounty ($1,666 in USDC). Rian, a young courier, owes a debt to the fixer Pak Darma — five jobs across the fictional Indonesian harbour city of Karang Bay are the only way out. Steal cars, outrun the police, deliver, collect, escape.

Everything is original: the city, the story, the art drawn in code and the WebAudio sound. Nothing comes from Rockstar Games.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

- **WASD / Arrows** — walk and drive · **SHIFT** — run
- **E** — enter / exit a car · **SPACE** — punch / handbrake
- **M** — mute · **P / ESC** — pause · **R** — restart mission

Five chained missions: First Delivery, Borrowed Wheels, Heat Wave, Debt Collection, The Last Bridge. Wanted level 0–5 stars, police cars and officers, traffic and pedestrians, a minimap, and your best cash saved in the browser.

## Files

- `game/` — the playable game as static files (`index.html` + `src/*.js`)
- `main.ts` — entrypoint: copies `game/` and `screenshots/` to the output directory and writes `dossier.json`
- `screenshots/` — four real renders of the running game
- `serve.ts` — tiny static server for local play

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
