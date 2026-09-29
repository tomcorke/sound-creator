# Reference analysis review

Reviewed the five local `domino-stone-sounds/sound-0{1–5}.wav` recordings. All are stereo, 24 kHz PCM, lasting 190–310 ms. The recordings remain outside the repository.

## Causes

- **Band-limited noise was classified as tonal.** Global spectral flatness included the quiet spectrum above the recording's bandwidth after resampling. At 48 kHz, all five references received low-frequency sine layers despite their broadband impacts. The existing tests used noise filling the entire Nyquist range, so they missed this case.
- **The model discarded most of the impact spectrum.** Peak detection stopped at 1600 Hz. Broadband suggestions used one filter around a low resonance rather than fitting the distribution of spectral power. A Hann window starting at the onset also attenuated the initial contact.
- **Volume and decay were guessed.** Oscillators started at a fixed relative gain; noise had a 0.05 gain floor. Neither reproduced the measured envelope. Noise playback applied both a buffer taper and an exponential gain fade.
- **Contacts required quiet gaps.** Sample 02's contacts at approximately 45, 65, and 130 ms became one event. Sample 05's late impacts were merged into its sliding sound.
- **Noise calibration depended on the output device.** White-noise power per frequency band changes with sample rate. Analysis and playback now both use 48 kHz rather than the device's default rate.

## Changes

The analyzer identifies persistent narrow peaks by local prominence and power, not whole-spectrum flatness. It retains ringing alongside residual noise. The residual spectrum is fitted to several filtered-noise bands, with up to six total layers per event. Centered windows retain the initial impact.

Energy rises detect contacts during existing decays. Each layer carries a measured five-millisecond RMS envelope and a fitted gain. Playback interpolates that envelope without adding another taper. The editor exposes **Use manual fade** to return to ordinary attack/fade controls. Existing settings without envelopes still load and play.

## Measurements

Compared the original implementation at `e83c8d2` with the updated file-analysis and playback paths in Chromium. Both runs decoded and rendered at 48 kHz, downmixed the reference to mono, and used the same seeded noise generator. These are signal measurements, not a listening test.

| File         | Spectral error, before/after (dB) | Envelope error, before/after | Output/reference RMS, before/after |
| ------------ | --------------------------------- | ---------------------------- | ---------------------------------- |
| sound-01.wav | 19.92 / 3.73                      | 5.03 / 0.29                  | 5.89 / 0.87                        |
| sound-02.wav | 19.22 / 1.96                      | 3.08 / 0.26                  | 3.60 / 0.98                        |
| sound-03.wav | 18.52 / 3.70                      | 4.23 / 0.18                  | 5.12 / 0.89                        |
| sound-04.wav | 21.22 / 3.59                      | 2.53 / 0.19                  | 3.22 / 0.95                        |
| sound-05.wav | 19.45 / 2.69                      | 14.23 / 0.25                 | 14.71 / 0.98                       |

Mean spectral error fell from 19.66 to 3.13 dB. Mean relative envelope error fell from 5.82 to 0.23. Sample 02 now has three detected contacts; sample 05 separates the initial contact, slide, and two late impacts.

Spectral error is the RMS dB difference between normalized powers in six bands: below 250 Hz, 250–500, 500–1000, 1000–2000, 2000–4000, and above 4000 Hz. Measurements use a 1024-point Hann FFT with a 512-sample hop and a normalized-power floor of 0.0001. Envelope error is `sqrt(sum((referenceRms - outputRms)^2) / sum(referenceRms^2))`, measured in five-millisecond windows without volume normalization. Values above one are possible. Noise uses an LCG seeded with 123456; ordinary playback remains random.

Regression tests cover band-limited noise, overlapping contacts, quiet gains, mixed high-frequency ringing/noise, envelope playback, JSON validation, and library persistence. Browser checks also exercised analyze, apply, export, and preview for all five files, plus save/reload/load and the manual-fade control.

## Limits

This remains a layered synthesis estimate. Octave-band fitting does not capture fine spectral notches. Layers within an event share one envelope, so individual resonance decays and time-varying noise coloration remain approximate. Noise phase and stereo placement are not reconstructed. Analysis still covers the first three seconds, at most ten events, and two seconds per layer. The 0.3 per-layer gain ceiling can limit loud recordings.
