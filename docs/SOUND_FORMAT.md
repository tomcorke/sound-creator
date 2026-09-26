# Sound settings format

Sound Creator exports one JSON object per sound. Version 1 stores a name and two optional layers: a pitched oscillator and a filtered noise click. The complete Scrabble tile example lives in [`examples/scrabble-tile.json`](examples/scrabble-tile.json).

## Fields

| Field                   | Type    | Valid values                             | Meaning                              |
| ----------------------- | ------- | ---------------------------------------- | ------------------------------------ |
| `version`               | integer | `1`                                      | Format version.                      |
| `name`                  | string  | Up to 48 characters                      | Display name and suggested filename. |
| `tone.enabled`          | boolean | `true` or `false`                        | Play the oscillator layer.           |
| `tone.waveform`         | string  | `sine`, `square`, `sawtooth`, `triangle` | Oscillator waveform.                 |
| `tone.startFrequencyHz` | number  | 100–1600                                 | Starting pitch.                      |
| `tone.endFrequencyHz`   | number  | 50–1600                                  | Ending pitch.                        |
| `tone.sweepMs`          | number  | 5–150                                    | Time to sweep between pitches.       |
| `tone.fadeMs`           | number  | 5–300                                    | Tone gain fade time.                 |
| `tone.durationMs`       | number  | 15–300                                   | Time before the oscillator stops.    |
| `tone.gain`             | number  | 0.01–0.3                                 | Linear oscillator level.             |
| `click.enabled`         | boolean | `true` or `false`                        | Play the noise layer.                |
| `click.durationMs`      | number  | 3–60                                     | Noise duration and fade time.        |
| `click.highpassHz`      | number  | 200–6000                                 | High-pass filter cutoff.             |
| `click.gain`            | number  | 0.01–0.25                                | Linear noise level.                  |

The player rejects unsupported versions, missing fields, invalid waveforms, and values outside these ranges. Validate JSON loaded from outside your app with `isSoundSettings` before playback.

## Reference player

[`src/sound.ts`](../src/sound.ts) is the reference implementation. It creates one `AudioContext` on first use and reuses it. The oscillator uses an exponential pitch sweep and gain fade. Its fade and stop times are separate settings. The click uses generated noise, a high-pass filter, and a short fade. No audio files are needed.

Call playback from a user action so browsers can start audio:

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

`playSound` returns `false` if the settings are invalid or Web Audio is unavailable.

## Examples

- [Vanilla JavaScript example](examples/vanilla.html) loads and plays the example JSON. Run `pnpm dev`, then open `/docs/examples/vanilla.html`.
- [React button example](examples/react-sound-button.tsx) validates settings and plays them from a click handler.

Both examples import the reference player. Copy `src/sound.ts` into a Vite app or bundle it with your TypeScript app. The JSON file works without React.
