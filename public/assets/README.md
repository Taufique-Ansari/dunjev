# Installed art — no upload required

The active game uses `public/assets/ansimuz/`, automatically served by Vite at `/assets/ansimuz/`. It contains 19 artist-made PNGs plus the original CC0 license and credits. Source: https://ansimuz.itch.io/gothicvania-patreon-collection

## Characters

All animation sheets are a single horizontal row with transparent backgrounds. Preserve original dimensions, padding, and foot alignment when replacing files. Actual sizes vary by character:

| Prefix | One frame | Idle frames | Walk frames | Attack frames | Extra |
|---|---|---|---|---|---|
| hero | 128×96 | 4 | 12 | 6 | hurt: 3 |
| scout | 128×64 | 4 | 7 | 5 | — |
| ogre | 144×80 | 4 | 6 | 7 | — |
| dragon | 144×64 | 6 | idle used while moving | 7 | tail: 8, reserved |

Examples: `hero-walk.png` is 1536×96. `ogre-attack.png` is 1008×80. Hero/scout face right; ogre/dragon face left in the source. Phaser handles mirroring.

The animation registry is `src/game/art.ts`. To replace artwork of the same dimensions/layout, replace the named PNG and reload the browser. For a different pack, change that registry's frame sizes/counts and file mapping. Arbitrarily named uploads or mismatched sheets are not automatically compatible.

## Environments

`sky.png` and `forest.png` form the causeway layers. `castle.png` is a modular background atlas, `stone.png` a tileset used for the combat paving, `lava.png` and `rocks.png` form the dragon's cavern. Phaser composes the layers and tiles; no full-screen screenshot is used as the game background.

## UI and license

The health cards, keyboard hints, chapter controls, typography and borders are project-authored CSS/Phaser UI. Characters and environment art are from Ansimuz. The original `ansimuz/public-license.pdf` permits use, modification and redistribution under CC0. Keep the credits alongside replacement packs.
