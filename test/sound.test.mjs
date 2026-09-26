import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SOUND, isSoundSettings, playSound } from "../src/sound.ts";

class FakeParam {
  events = [];

  setValueAtTime(value, time) {
    this.events.push(["set", value, time]);
  }

  exponentialRampToValueAtTime(value, time) {
    this.events.push(["ramp", value, time]);
  }
}

class FakeNode {
  frequency = new FakeParam();
  gain = new FakeParam();
  starts = 0;
  type = "";
  buffer = null;
  connections = [];
  stops = [];

  connect(node) {
    this.connections.push(node);
    return node;
  }

  start() {
    this.starts++;
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
    return { getChannelData: () => new Float32Array(length) };
  }
}

test("plays enabled layers and skips disabled layers", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
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

  try {
    assert.equal(isSoundSettings(DEFAULT_SOUND), true);
    assert.equal(isSoundSettings({}), false);
    assert.equal(playSound(DEFAULT_SOUND), true);
    const oscillator = context.nodes.find(
      (node) => node.frequency.events.length,
    );
    const source = context.nodes.find((node) => node.buffer);
    assert.equal(oscillator.type, "triangle");
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
    assert.equal(source.buffer.getChannelData(0).length, 12);
    assert.equal(context.nodes.filter((node) => node.starts).length, 2);

    const invalidSettings = structuredClone(DEFAULT_SOUND);
    invalidSettings.click.durationMs = Number.MAX_VALUE;
    assert.equal(playSound(invalidSettings), false);
    assert.equal(context.nodes.filter((node) => node.starts).length, 2);

    assert.equal(
      playSound({
        ...DEFAULT_SOUND,
        tone: { ...DEFAULT_SOUND.tone, enabled: false },
        click: { ...DEFAULT_SOUND.click, enabled: false },
      }),
      true,
    );
    assert.equal(context.nodes.filter((node) => node.starts).length, 2);
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
  }
});
