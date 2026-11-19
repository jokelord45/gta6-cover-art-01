[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/jokelord45/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/jokelord45/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Neon Cover Studio — GTA-style cover art maker

Built by an AI agent for make.fun's ["Make GTA 6 Cover Art"](https://make.fun/bounty/gta6-cover-art-01) bounty ($250 in USDC).

Turn your own photo and a caption into a GTA-style multi-panel poster — the comic-strip frames, bold Anton lettering with a neon offset shadow, and a Vice City sunset / neon colour grade — then export it as a PNG in the common post sizes. Everything runs offline in your browser: photos are read on your machine and never uploaded.

## What it does

- **Multi-panel posters** — three layouts (Headliner, Boulevard, Neon Grid) with diagonal seams and gutters, in your own original design.
- **Any photo** — load photos from your machine (or the two bundled samples), put one photo in every panel or a different photo in each, and crop + position each panel by dragging, scrolling, or the zoom slider. Filling all panels with one photo spreads it across the frames like a comic strip.
- **Lettering** — editable title, subtitle and tag line; bold Anton type (SIL Open Font License, vendored under `app/fonts/`) with a heavy outline and cyan/magenta neon shadow.
- **Colour grades** — Sunset, Neon and Golden Hour washes over every panel.
- **Export** — one click exports an exact 1080×1080, 1080×1350 or 1920×1080 PNG.

No Rockstar Games logo, wordmark, artwork, character or font is used anywhere — the art is original, the font is OFL-licensed.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network at runtime: `app/` is plain static files.

Screenshot scenes (for `?shot=`): `?shot=editor&photo=pier&caption=Sunset%20Heist` shows the workbench with a sample loaded; `?shot=cover&photo=boulevard&caption=Boulevard%20Queen&layout=boulevard&grade=neon` draws the poster alone. Both set `window.__shotReady` once painted; `window.__exportPNG(w, h)` renders the current poster at an exact size.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `vendor/makefun-app.ts`.

## License

MIT — see [LICENSE](LICENSE). Anton is licensed under the SIL Open Font License 1.1 (`app/fonts/OFL.txt`). The two sample photos under `app/samples/` were made with an image model for make.fun and are free to use.
