# Sound settings format

Sound Creator exports one version 2 JSON object per sound. Each sound contains a `layers` array; the editor can add, remove, duplicate, and reorder oscillator and filtered-noise layers. The Scrabble tile example is in [`examples/scrabble-tile.json`](examples/scrabble-tile.json).

## Fields

Every sound has:

| Field     | Type    | Valid values           | Meaning                                 |
| --------- | ------- | ---------------------- | --------------------------------------- |
| `version` | integer | `2`                    | Format version.                         |
| `name`    | string  | Up to 48 characters    | Display name and suggested filename.    |
| `layers`  | array   | Up to 64 layer objects | Layers played together, in array order. |

Every layer has `id` (a non-empty string up to 80 characters), `type`, `delayMs`, `enabled`, `gain`, `durationMs`, and `fadeMs`. `delayMs` ranges from 0 to 3000 ms. `gain` ranges from `0.00001` to `0.3`, so quiet recordings can retain their level.

| Layer type   | Additional fields                                                              | Valid values                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `oscillator` | `waveform`, `startFrequencyHz`, `endFrequencyHz`, `sweepMs`                    | Waveform: `sine`, `square`, `sawtooth`, `triangle`; start frequency: 100–16000 Hz; end frequency: 50–16000 Hz; sweep: 5–150 ms. |
| `noise`      | `filterType`, `filterFrequencyHz`; optional `filterEndFrequencyHz`, `attackMs` | Filter: `highpass`, `lowpass`, `bandpass`; frequency: 200–16000 Hz; sweep and attack: 0–2000 ms.                                |

Oscillator duration and fade range from 15 to 2000 ms. Noise duration and fade range from 3 to 2000 ms. Noise layers may set `filterEndFrequencyHz` to sweep the filter from `filterFrequencyHz` over the layer duration, and `attackMs` to ramp up from silence. Omit them for a static filter and immediate attack. Each layer object is strict: unknown and missing required fields are rejected.

Both layer types may include `envelope`: an array of 2–401 finite levels between `0` and `1`. Points are evenly spaced from the layer's start to its end. Playback multiplies each point by `gain` and linearly interpolates between points. When present, this curve replaces `fadeMs`, noise `attackMs`, and the noise buffer's built-in taper. Changing duration stretches the curve; changing gain scales it. **Use manual fade** removes the curve and restores the fade and attack controls. See [`examples/analyzed-impact.json`](examples/analyzed-impact.json).

Existing version 2 settings remain valid without an envelope. Use the current reference player for envelopes, quieter gains, and expanded frequency ranges; older strict schemas reject these extensions.

The Zod schema in `src/sound.ts` validates version 2 settings before playback. Version 2 records without `delayMs` default it to `0`; `migrateSoundSettings()` also upgrades version 1 settings. Existing version 1 IndexedDB entries are migrated and rewritten when the library loads. Invalid library records are skipped and reported.

## Analyze a reference recording

Choose an audio file in the editor. The browser decodes it locally at 48 kHz, matching synthesis; Sound Creator does not upload or save it. The analyzer measures RMS every five milliseconds and detects both quiet gaps and sudden energy rises, so overlapping contacts can become separate events. Centered spectral windows retain the initial impact rather than suppressing it.

Each event can produce up to six layers. Persistent narrow peaks become sine oscillators, while the remaining spectral power is fitted to a mixture of filtered-noise bands across the spectrum. Ringing and broadband noise can coexist. Layers retain the measured envelope, level, and event delay. Longer rising events with changing spectra can also get a filter sweep.

These are synthesized approximations, not exact reconstructions. Noise phase, stereo position, fine spectral detail, and changing resonance decay are not reproduced. The JSON export contains settings and measured envelopes only, not the reference audio. See [the analysis review and sample measurements](ANALYSIS_REVIEW.md).

The browser must support decoding the file's audio format. Files are limited to 25 MB and 30 seconds; analysis examines the first three seconds and suggests layers for up to 10 events. You can listen to the reference beside the generated preview and adjust the suggested layers.

## Reference player

[`src/sound.ts`](../src/sound.ts) is the playback implementation. It reuses one 48 kHz `AudioContext`, starts one oscillator per oscillator layer, and generates noise for each noise layer. A fixed synthesis rate keeps fitted noise levels independent of the output device's sample rate. Call playback from a user action so browsers can start audio:

```ts
import { isSoundSettings, playSound } from "./sound.ts";

const settings: unknown = await fetch("/sounds/tile.json").then((response) =>
  response.json(),
);
const button = document.querySelector("button");

button?.addEventListener("click", () => {
  if (isSoundSettings(settings)) playSound(settings);
});
```

`isSoundSettings` accepts version 2. For version 1 JSON, call `migrateSoundSettings()` first. `playSound` returns `false` if settings are invalid or Web Audio is unavailable.

## Examples

- [Vanilla JavaScript example](examples/vanilla.html) loads and plays the example JSON. Run `pnpm dev`, then open `/docs/examples/vanilla.html`.
- [React button example](examples/react-sound-button.tsx) validates settings and plays them from a click handler.

Both examples import the reference player. Copy `src/sound.ts` into a Vite app or bundle it with your TypeScript app, and add the `zod` dependency. The JSON file works without React.
