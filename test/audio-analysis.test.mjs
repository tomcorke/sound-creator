import assert from "node:assert/strict";
import test from "node:test";
import { analyzeAudioBuffer } from "../src/audio-analysis.ts";
import { isSoundSettings } from "../src/sound.ts";

function bufferWith(sampleAt, duration = 0.5, sampleRate = 16_384) {
  const length = Math.floor(sampleRate * duration);
  const samples = Float32Array.from({ length }, (_, index) =>
    sampleAt(index / sampleRate, index),
  );
  return {
    duration,
    length,
    numberOfChannels: 1,
    sampleRate,
    getChannelData: () => samples,
  };
}

test("finds resonant peaks and suggests one oscillator per peak", () => {
  const result = analyzeAudioBuffer(
    bufferWith(
      (time) =>
        Math.sin(2 * Math.PI * 440 * time) +
        0.4 * Math.sin(2 * Math.PI * 880 * time),
    ),
  );

  assert.equal(result.durationMs, 500);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].delayMs, 0);
  assert.equal(result.events[0].durationMs, 500);
  assert.ok(result.events[0].attackMs >= 3);
  assert.ok(
    result.peakFrequenciesHz.some(
      (frequency) => Math.abs(frequency - 440) < 10,
    ),
  );
  assert.ok(
    result.peakFrequenciesHz.some(
      (frequency) => Math.abs(frequency - 880) < 10,
    ),
  );
  assert.equal(
    result.layers.filter((layer) => layer.type === "oscillator").length,
    result.peakFrequenciesHz.length,
  );
});

test("estimates the active span without leading and trailing silence", () => {
  const result = analyzeAudioBuffer(
    bufferWith((time) => {
      if (time < 0.1 || time > 0.8) return 0;
      return Math.exp(-(time - 0.1) * 4) * Math.sin(2 * Math.PI * 440 * time);
    }, 1),
  );

  assert.equal(result.durationMs, 1000);
  assert.equal(result.events.length, 1);
  assert.ok(result.events[0].delayMs >= 95 && result.events[0].delayMs <= 105);
  assert.ok(
    result.events[0].durationMs >= 650 && result.events[0].durationMs <= 720,
  );
});

test("keeps two recorded strike onsets separate in suggested layers", () => {
  const result = analyzeAudioBuffer(
    bufferWith((time, index) => {
      function strike(onset, level) {
        const elapsed = time - onset;
        if (elapsed < 0 || elapsed > 0.135) return 0;
        const resonance =
          level *
          Math.exp(-elapsed * 25) *
          (Math.sin(2 * Math.PI * 520 * elapsed) +
            0.4 * Math.sin(2 * Math.PI * 1300 * elapsed));
        const noise =
          elapsed < 0.01 ? level * 0.25 * Math.sin((index + 1) * 12.9898) : 0;
        return resonance + noise;
      }
      return strike(0.05, 0.5) + strike(0.185, 1);
    }, 0.3),
  );
  const delays = result.layers.map((layer) => layer.delayMs);
  assert.ok(delays.some((delay) => Math.abs(delay - 50) < 7));
  assert.ok(delays.some((delay) => Math.abs(delay - 185) < 7));
  assert.ok(result.events[0].durationMs >= 100);
  assert.ok(result.events[1].durationMs >= 30);
});

test("keeps broadband double-click references free of oscillator layers", () => {
  const result = analyzeAudioBuffer(
    bufferWith((time, index) => {
      function click(onset, level, salt) {
        const elapsed = time - onset;
        if (elapsed < 0 || elapsed > 0.04) return 0;
        const value = Math.sin((index + salt) * 12.9898) * 43_758.5453;
        const noise = (value - Math.floor(value)) * 2 - 1;
        return level * noise * Math.exp(-elapsed * 100);
      }
      return click(0.05, 0.05, 0) + click(0.185, 0.1, 2_000);
    }, 0.3),
  );

  assert.equal(
    result.layers.some((layer) => layer.type === "oscillator"),
    false,
  );
  const noiseLayers = result.layers.filter((layer) => layer.type === "noise");
  assert.deepEqual(
    [...new Set(noiseLayers.map((layer) => layer.delayMs))],
    [50, 185],
  );
  for (const event of result.events) {
    const layers = noiseLayers.filter(
      (layer) => layer.delayMs === event.delayMs,
    );
    assert.ok(layers.length > 0 && layers.length <= 6);
    assert.ok(layers.every((layer) => layer.durationMs === event.durationMs));
  }
  assert.ok(
    Math.max(
      ...noiseLayers
        .filter((layer) => layer.delayMs === 185)
        .map((layer) => layer.gain),
    ) >
      Math.max(
        ...noiseLayers
          .filter((layer) => layer.delayMs === 50)
          .map((layer) => layer.gain),
      ),
  );
});

test("retains impact resonances without discarding their broadband component", () => {
  const result = analyzeAudioBuffer(
    bufferWith((time, index) => {
      const elapsed = time - 0.1;
      if (elapsed < 0 || elapsed > 0.12) return 0;
      const value = Math.sin(index * 12.9898) * 43_758.5453;
      const noise = (value - Math.floor(value)) * 2 - 1;
      return (
        0.04 * noise * Math.exp(-elapsed * 40) +
        0.01 * Math.sin(2 * Math.PI * 1350 * elapsed) * Math.exp(-elapsed * 30)
      );
    }, 0.3),
  );
  const noise = result.layers.find((layer) => layer.type === "noise");

  assert.ok(noise);
  assert.ok(
    result.layers.some((layer) =>
      layer.type === "oscillator"
        ? Math.abs(layer.startFrequencyHz - 1350) < 30
        : Math.abs(layer.filterFrequencyHz - 1350) < 300,
    ),
  );
  assert.ok(
    result.layers.some(
      (layer) => layer.type === "noise" && layer.filterFrequencyHz >= 4000,
    ),
  );
});

test("captures the attack and spectral sweep of a broadband slide", () => {
  const sampleRate = 24_000;
  let filteredNoise = 0;
  const result = analyzeAudioBuffer(
    bufferWith(
      (time, index) => {
        const value = Math.sin(index * 12.9898) * 43_758.5453;
        const noise = (value - Math.floor(value)) * 2 - 1;
        const click = time >= 0.05 && time < 0.065 ? noise * 0.08 : 0;
        const elapsed = time - 0.11;
        if (elapsed < 0 || elapsed > 0.2) {
          filteredNoise = 0;
          return click;
        }
        const cutoff = 5000 - 4000 * (elapsed / 0.2);
        const alpha = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
        filteredNoise += alpha * (noise - filteredNoise);
        const envelope = elapsed < 0.1 ? elapsed / 0.1 : (0.2 - elapsed) / 0.1;
        return click + 0.08 * filteredNoise * Math.max(0, envelope);
      },
      0.4,
      sampleRate,
    ),
  );
  const slideEvent = result.events.find((event) => event.delayMs > 80);
  const slide = result.layers.find(
    (layer) => layer.type === "noise" && layer.delayMs === slideEvent.delayMs,
  );

  assert.ok(slideEvent.attackMs >= 30);
  assert.ok(slide.attackMs >= 30);
  assert.ok(slide.filterEndFrequencyHz < slide.filterFrequencyHz);
  assert.ok(slide.durationMs >= 100);
});

test("does not mistake band-limited broadband noise for pitched ringing", () => {
  const filtered = [0, 0, 0, 0];
  const result = analyzeAudioBuffer(
    bufferWith(
      (time, index) => {
        const value = Math.sin(index * 12.9898) * 43_758.5453;
        let noise = (value - Math.floor(value)) * 2 - 1;
        for (let stage = 0; stage < filtered.length; stage++) {
          filtered[stage] += 0.2 * (noise - filtered[stage]);
          noise = filtered[stage];
        }
        return 0.04 * noise * Math.exp(-time * 20);
      },
      0.2,
      48_000,
    ),
  );
  assert.ok(result.layers.length > 0);
  assert.ok(result.layers.every((layer) => layer.type === "noise"));
  assert.ok(
    isSoundSettings({
      version: 2,
      name: "Band limited",
      layers: result.layers,
    }),
  );
});

test("detects contacts that arrive before the preceding decay ends", () => {
  const result = analyzeAudioBuffer(
    bufferWith(
      (time, index) => {
        const value = Math.sin(index * 12.9898) * 43_758.5453;
        const noise = (value - Math.floor(value)) * 2 - 1;
        return [0.045, 0.065, 0.13].reduce((sum, onset, strike) => {
          const elapsed = time - onset;
          return elapsed < 0
            ? sum
            : sum +
                [0.015, 0.08, 0.04][strike] * noise * Math.exp(-elapsed * 45);
        }, 0);
      },
      0.2,
      24_000,
    ),
  );

  for (const onset of [45, 65, 130])
    assert.ok(
      result.events.some((event) => Math.abs(event.delayMs - onset) <= 5),
    );
  assert.ok(
    isSoundSettings({ version: 2, name: "Contacts", layers: result.layers }),
  );
});

test("fits quiet recordings without a gain floor and retains their envelope", () => {
  const analyze = (level) =>
    analyzeAudioBuffer(
      bufferWith(
        (time, index) => {
          const value = Math.sin(index * 12.9898) * 43_758.5453;
          const noise = (value - Math.floor(value)) * 2 - 1;
          return time < 0.05
            ? 0
            : level * noise * Math.exp(-(time - 0.05) * 25);
        },
        0.2,
        24_000,
      ),
    );
  const loud = analyze(0.04);
  const quiet = analyze(0.004);
  assert.equal(quiet.layers.length, loud.layers.length);
  quiet.layers.forEach((layer, index) => {
    assert.ok(Math.abs(layer.gain / loud.layers[index].gain - 0.1) < 0.01);
    assert.ok(layer.envelope.length > 2);
    assert.equal(layer.envelope.at(-1), 0);
  });
  assert.ok(
    isSoundSettings({ version: 2, name: "Quiet", layers: quiet.layers }),
  );
});

test("retains high pitched ringing together with broadband noise", () => {
  const result = analyzeAudioBuffer(
    bufferWith(
      (time, index) => {
        const value = Math.sin(index * 12.9898) * 43_758.5453;
        const noise = (value - Math.floor(value)) * 2 - 1;
        return (
          (0.04 * noise + 0.08 * Math.sin(2 * Math.PI * 4400 * time)) *
          Math.exp(-time * 15)
        );
      },
      0.2,
      24_000,
    ),
  );
  assert.ok(result.layers.some((layer) => layer.type === "noise"));
  assert.ok(
    result.layers.some(
      (layer) =>
        layer.type === "oscillator" &&
        Math.abs(layer.startFrequencyHz - 4400) < 30,
    ),
  );
  assert.ok(
    isSoundSettings({ version: 2, name: "Ring", layers: result.layers }),
  );
});

test("suggests filtered noise for a broadband reference", () => {
  const result = analyzeAudioBuffer(
    bufferWith((_, index) => {
      const value = Math.sin(index * 12.9898) * 43_758.5453;
      return (value - Math.floor(value)) * 2 - 1;
    }),
  );

  const noise = result.layers.find((layer) => layer.type === "noise");
  assert.ok(noise);
});
