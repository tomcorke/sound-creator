import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  DEFAULT_SOUND,
  SOUND_SAMPLE_RATE,
  isSoundSettings,
  migrateSoundSettings,
  playSound,
} from "../src/sound.ts";

class FakeParam {
  events = [];

  setValueAtTime(value, time) {
    this.events.push(["set", value, time]);
  }

  exponentialRampToValueAtTime(value, time) {
    this.events.push(["ramp", value, time]);
  }

  linearRampToValueAtTime(value, time) {
    this.events.push(["linear", value, time]);
  }
}

class FakeNode {
  frequency = new FakeParam();
  gain = new FakeParam();
  starts = 0;
  startTimes = [];
  type = "";
  buffer = null;
  connections = [];
  stops = [];

  connect(node) {
    this.connections.push(node);
    return node;
  }

  start(time) {
    this.starts++;
    this.startTimes.push(time);
  }

  stop(time) {
    this.stops.push(time);
  }
}

class FakeAudioContext {
  state = "running";
  currentTime = 2;
  sampleRate = 1000;
  destination = {};
  nodes = [];

  createOscillator() {
    const node = new FakeNode();
    this.nodes.push(node);
    return node;
  }

  createGain() {
    const node = new FakeNode();
    this.nodes.push(node);
    return node;
  }

  createBufferSource() {
    const node = new FakeNode();
    this.nodes.push(node);
    return node;
  }

  createBiquadFilter() {
    const node = new FakeNode();
    this.nodes.push(node);
    return node;
  }

  createBuffer(_channels, length) {
    const samples = new Float32Array(length);
    return { getChannelData: () => samples };
  }
}

test("plays every enabled layer and skips disabled layers", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const context = new FakeAudioContext();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      AudioContext: class {
        constructor(options) {
          assert.equal(options.sampleRate, SOUND_SAMPLE_RATE);
          return context;
        }
      },
    },
  });

  try {
    const settings = structuredClone(DEFAULT_SOUND);
    Object.assign(settings.layers[1], {
      delayMs: 50,
      attackMs: 110,
      durationMs: 200,
      fadeMs: 90,
      filterEndFrequencyHz: 2500,
    });
    settings.layers.push({
      ...settings.layers[0],
      id: "second-tone",
      delayMs: 185,
      waveform: "sine",
      startFrequencyHz: 500,
      endFrequencyHz: 500,
      gain: 0.06,
    });
    settings.layers.push({
      ...settings.layers[1],
      id: "disabled-noise",
      enabled: false,
    });
    assert.equal(isSoundSettings(DEFAULT_SOUND), true);
    assert.equal(isSoundSettings({}), false);
    assert.equal(playSound(settings), true);
    const oscillator = context.nodes.find((node) => node.type === "triangle");
    const source = context.nodes.find((node) => node.buffer);
    assert.deepEqual(oscillator.frequency.events, [
      ["set", 780, 2],
      ["ramp", 260, 2.035],
    ]);
    assert.deepEqual(oscillator.stops, [2.05]);
    const toneGain = context.nodes.find((node) => node.gain.events.length);
    assert.deepEqual(toneGain.gain.events, [
      ["set", 0.13, 2],
      ["ramp", 0.001, 2.045],
    ]);
    assert.equal(source.buffer.getChannelData(0).length, 200);
    const noiseFilter = context.nodes.find((node) => node.type === "highpass");
    assert.deepEqual(noiseFilter.frequency.events, [
      ["set", 900, 2.05],
      ["ramp", 2500, 2.25],
    ]);
    const noiseGain = context.nodes.find(
      (node) => node.gain.events[0]?.[1] === 0.001,
    );
    assert.deepEqual(noiseGain.gain.events, [
      ["set", 0.001, 2.05],
      ["linear", 0.08, 2.05 + 110 / 1000],
      ["ramp", 0.001, 2.25],
    ]);
    assert.equal(context.nodes.filter((node) => node.starts).length, 3);
    assert.deepEqual(
      context.nodes.find((node) => node.type === "sine").startTimes,
      [2.185],
    );

    const invalidSettings = structuredClone(settings);
    invalidSettings.layers[1].durationMs = Number.MAX_VALUE;
    assert.equal(playSound(invalidSettings), false);
    assert.equal(context.nodes.filter((node) => node.starts).length, 3);

    assert.equal(
      playSound({
        ...settings,
        layers: settings.layers.map((layer) => ({ ...layer, enabled: false })),
      }),
      true,
    );
    assert.equal(context.nodes.filter((node) => node.starts).length, 3);
  } finally {
    context.state = "closed";
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
  }
});

test("plays measured envelopes without adding a second noise fade", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousRandom = Math.random;
  const context = new FakeAudioContext();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      AudioContext: class {
        constructor() {
          return context;
        }
      },
    },
  });
  Math.random = () => 0.75;
  try {
    const settings = structuredClone(DEFAULT_SOUND);
    for (const layer of settings.layers) {
      layer.envelope = [0, 1, 0.5, 0];
      layer.gain = 0.002;
      layer.durationMs = 60;
      layer.delayMs = 100;
    }
    assert.equal(playSound(settings), true);
    for (const gain of context.nodes.filter((node) => node.gain.events.length))
      assert.deepEqual(gain.gain.events, [
        ["set", 0, 2.1],
        ["linear", 0.002, 2.12],
        ["linear", 0.001, 2.14],
        ["linear", 0, 2.16],
      ]);
    const source = context.nodes.find((node) => node.buffer);
    assert.ok(
      source.buffer.getChannelData(0).every((sample) => sample === 0.5),
    );
    assert.deepEqual(source.stops, [2.16]);
    delete settings.layers[0].envelope;
    context.nodes.length = 0;
    assert.equal(
      playSound({ ...settings, layers: [settings.layers[0]] }),
      true,
    );
    const fade = context.nodes.find((node) => node.gain.events.length);
    assert.ok(fade.gain.events.at(-1)[1] < settings.layers[0].gain);
  } finally {
    context.state = "closed";
    Math.random = previousRandom;
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
  }
});

test("validates exported examples and rejects invalid measured envelopes", async () => {
  for (const name of ["scrabble-tile", "analyzed-impact"]) {
    const json = await readFile(
      new URL(`../docs/examples/${name}.json`, import.meta.url),
      "utf8",
    );
    assert.equal(isSoundSettings(JSON.parse(json)), true);
  }
  for (const envelope of [
    [1],
    new Array(402).fill(1),
    [0, 1.1],
    [-0.1, 0],
    [0, NaN],
    "invalid",
  ]) {
    const settings = structuredClone(DEFAULT_SOUND);
    settings.layers[0].envelope = envelope;
    assert.equal(isSoundSettings(settings), false);
  }
});

test("migrates version 1 tone and click settings to layers", () => {
  const legacy = {
    version: 1,
    name: "Old tile",
    tone: {
      enabled: true,
      waveform: "triangle",
      startFrequencyHz: 780,
      endFrequencyHz: 260,
      sweepMs: 35,
      fadeMs: 45,
      durationMs: 50,
      gain: 0.13,
    },
    click: { enabled: true, durationMs: 12, highpassHz: 900, gain: 0.08 },
  };
  const migrated = migrateSoundSettings(legacy);

  assert.equal(migrated.version, 2);
  assert.equal(migrated.layers.length, 2);
  assert.equal(migrated.layers[0].type, "oscillator");
  assert.equal(migrated.layers[1].type, "noise");
  assert.equal(migrated.layers[1].filterFrequencyHz, 900);
  assert.equal(isSoundSettings(migrated), true);
  const oldLayered = structuredClone(DEFAULT_SOUND);
  delete oldLayered.layers[0].delayMs;
  assert.equal(migrateSoundSettings(oldLayered).layers[0].delayMs, 0);
  assert.equal(migrateSoundSettings({ version: 1 }), null);
});
