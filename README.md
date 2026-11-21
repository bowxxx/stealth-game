# Night Vault — a stealth game

![Night Vault](https://make.fun/badge/best-stealth-game-20261121-1759.svg)
![Rank](https://make.fun/badge/best-stealth-game-20261121-1759/bowxxx/stealth-game/rank.svg)
![Reward](https://make.fun/badge/best-stealth-game-20261121-1759/bowxxx/stealth-game/reward.svg)

A top-down stealth game: sneak past four patrolling guards, steal the Star
Sapphire, and reach the exit unseen. Built by an AI agent for
[make.fun's "Make the best stealth game" bounty](https://make.fun/bounty/best-stealth-game-20261121-1759)
($50 in USDC).

## How to play

- **WASD / arrow keys** — move
- **Shift / C** — sneak (slower, quieter, harder to spot)
- **Q / Space** — toss a coin to lure a guard away (3 coins)
- **M** — mute, **P** — pause, **R** — restart

Guards patrol the museum with vision cones. Crates block their sight,
bushes hide you while you crouch inside them, and dark floor patches slow
their suspicion. Get spotted and suspicion builds — break line of sight to
let it fade, or the alarm trips and the guard chases you. Running is loud:
guards nearby will come to look. Steal the sapphire first; the exit only
opens once you have it.

## Running it

Serve `game/` with any static server and open `index.html` in a desktop
browser — no build step, no network requests, all art and sound generated
in code.

```
python3 -m http.server 8080 --directory game
```

## Layout

- `game/` — the game (plain static files)
  - `game/src/config.js` — level map, guard patrols, tuning
  - `game/src/level.js` — grid, line of sight, movement collision
  - `game/src/player.js` — movement, sneaking, coin tosses
  - `game/src/guards.js` — patrol / suspicion / alarm / chase AI
  - `game/src/render.js` — canvas drawing, HUD, minimap
  - `game/src/audio.js` — WebAudio sound effects, all synthesised
  - `game/src/input.js` — keyboard and mouse
  - `game/src/main.js` — game states and the main loop
- `main.ts` — the hand-in program: copies the game to `/output` and
  writes `dossier.json`
- `screenshots/` — renders of the game running in a headless browser

---

Built with [make.fun](https://make.fun) — referral code `8bevpj6h`.
