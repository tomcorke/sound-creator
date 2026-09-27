# Sound Creator

[Open the live app](https://sound-creator.corke.dev/).

Browser editor for short synthesized sounds. Analyze a local recording, build a sound from oscillator and filtered-noise layers, preview it, and export settings as JSON.

## Run locally

Requires Node.js 22.12 or newer.

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite. Select **Test sound** after changing settings. Use **Copy JSON** or **Download .json** to export the current sound.

## Sound model

A sound can have up to 64 oscillator and filtered-noise layers, each with its own start delay, pitch or filter, level, duration, and fade. The editor starts with the Scrabble tile sound from `shared-scrabble-table`.

Choose a reference audio file to inspect its RMS envelope and spectral peaks. The browser keeps the file local; it is not uploaded, saved in the library, or included in exported JSON. Analysis suggests settings, not an exact reconstruction. No clips are bundled; built-in references would need permission to redistribute.

See [the settings format and examples](docs/SOUND_FORMAT.md).

## Library

Saved sounds live in IndexedDB for this browser and site. Zod validates each record when the app loads it and migrates version 1 records to version 2. The library does not sync across browsers.

## Publish

`main` contains source. GitHub Pages serves the built site from the root of `publish`. `public/CNAME` sets `sound-creator.corke.dev`; the DNS CNAME points to `tomcorke.github.io`. Follow the release steps in [AGENTS.md](AGENTS.md).

## Checks

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```
