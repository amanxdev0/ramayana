# RAMAYANA — a scroll-driven epic

A scroll-driven **3D** journey through the **Valmiki Ramayana** (Three.js, HELIOS-style): all 7 Kandas,
every great event, with **Rama's age and the years of exile advancing in the
HUD as you scroll** — from his birth in Ayodhya to the very end.

Real HTML chapters float over a living 3D film: nine staged dioramas
(moonlit Ayodhya, the yajna at dawn, the deep forest, misty Kishkindha,
the night crossing to Lanka, the battlefield, the serene reign…) that the
camera flies through as you scroll — with drifting fireflies, rising
embers, falling petals, and the five pixel-art characters as billboards
in the scenes where they belong.

## The journey

| Kanda | The book of… | Rama's age |
|---|---|---|
| I · Bala | Childhood | 0–16 |
| II · Ayodhya | Ayodhya — the exile begins | ~25 |
| III · Aranya | The forest | 25–38 |
| IV · Kishkindha | The vanaras | ~38 |
| V · Sundara | Hanuman's leap | ~38 |
| VI · Yuddha | The war | ~39 |
| VII · Uttara | The final book | 39 → beyond |

Ages follow the traditional telling and vary across retellings.

## Characters

Original 16-bit pixel-art portraits — Rama, Sita, Lakshmana, Hanuman and
Ravana — created for this project and embedded in the page (`assets/img1.js`, `img2.js`, `img3.js` as base64; originals under `assets/characters/`).

## Run it

Just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

No build step, no dependencies. Enable GitHub Pages on this repo to take it live.

Crafted by Aman Singh.
