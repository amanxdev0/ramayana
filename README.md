<div align="center">

# 🛕 RAMAYANA

**A scroll-driven 3D flight through the Valmiki Ramayana.**

All 7 Kandas, every great event — with **Rama's age and the years of exile advancing in the HUD as you scroll**, from his birth in Ayodhya to the very end. Real HTML chapters float over a living 3D film: nine staged dioramas the camera flies through, with the five pixel-art characters standing inside the scenes where they belong.

[![live demo](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square)](https://amanxdev0.github.io/ramayana/)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![three.js](https://img.shields.io/badge/three.js-%5E0.160.0-black?style=flat-square)](https://threejs.org/)

[Live demo](https://amanxdev0.github.io/ramayana/) · [Report a bug](https://github.com/amanxdev0/ramayana/issues)

</div>

---

## The journey

| Kanda | The book of… | Rama's age |
|---|---|---|
| I · Bala | Childhood — the yajna, Tataka, Sita's swayamvara | 0–16 |
| II · Ayodhya | Ayodhya — Kaikeyi's boons, the exile begins | ~25 |
| III · Aranya | The forest — Panchavati, the golden deer, the abduction | 25–38 |
| IV · Kishkindha | The vanaras — the pact with Sugriva, the search | ~38 |
| V · Sundara | Hanuman's leap — Ashoka Vatika, Lanka burns | ~38 |
| VI · Yuddha | The war — the Setu, Ravana falls on Vijayadashami | ~39 |
| VII · Uttara | The final book — the reign, Lava-Kusha, the farewell | 39 → beyond |

Ages follow the traditional telling and vary across retellings.

## What's in the 3D scene

- **Nine staged dioramas** — moonlit Ayodhya, the yajna at dawn, the deep forest of Dandaka, misty Kishkindha, the night crossing to burning Lanka, the battlefield with the Rama Setu and war banners, the serene reign, and a golden sunrise finale
- **Original 16-bit pixel-art characters** — Rama, Sita, Lakshmana, Hanuman and Ravana — as billboards standing in their scenes (created for this project, not scraped)
- **Living atmosphere** — drifting fireflies, rising embers, falling petals, waving banners, the darting golden deer, Hanuman's burning trail across the sky
- Film HUD: current Kanda, **Rama's age ticker**, era readout, progress bar

## The tech

- **Three.js** (r160, via CDN import map — no build step)
- HELIOS-style damped scroll playhead — the camera flies diorama to diorama with buttery easing
- Per-Kanda fog and background color keys; adaptive pixel ratio; `prefers-reduced-motion` support

## Characters

Original pixel-art portraits — Rama, Sita, Lakshmana, Hanuman, Ravana — embedded in the page (`assets/img1.js`, `img2.js`, `img3.js` as base64; originals under `assets/characters/`).

## Run it

Just open `index.html`, or serve the folder — no build step, no dependencies:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Enable GitHub Pages on this repo to take it live.

## The Scroll Series

Part of Aman Singh's scroll-driven cinematic universe — real HTML floating over live 3D films, where scroll is the playhead:

- [SCROLLFILM](https://amanxdev0.github.io/scrollfilm-3d/) — the original cinematic WebGL film + full reverse-engineering breakdown
- [HELIOS](https://amanxdev0.github.io/helios/) — scroll from the Milky Way to Pluto
- [ABYSS](https://amanxdev0.github.io/abyss/) — descend through the five ocean zones to Challenger Deep
- [EVENT HORIZON](https://amanxdev0.github.io/event-horizon/) — dive into the heart of a black hole
- [RAMAYANA](https://amanxdev0.github.io/ramayana/) — a 3D flight through the Valmiki Ramayana

Built with the [scrollfilm engine](https://github.com/amanxdev0/scrollfilm) — make your own.

## License

MIT © Aman Singh

Crafted by Aman Singh.
