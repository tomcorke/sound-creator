# Sound Creator

Browser editor for short synthesized sounds. Adjust two Web Audio layers, preview them, and export their settings as JSON.

## Run locally

Requires Node.js 22.12 or newer.

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite. Select **Test sound** after changing settings. Use **Copy JSON** or **Download .json** to export the current sound.

## Sound model

Each sound combines an optional pitched oscillator with an optional filtered noise click. The editor starts with the tile sound from `shared-scrabble-table`. Playback uses the Web Audio API; no audio files are bundled.

See [the settings format and examples](docs/SOUND_FORMAT.md).

## Checks

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```
