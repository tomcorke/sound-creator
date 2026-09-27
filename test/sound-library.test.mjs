import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SOUND } from "../src/sound.ts";
import { parseSavedSounds } from "../src/sound-library-schema.ts";

const legacy = {
  version: 1,
  name: "Old format",
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

test("validates, migrates, and sorts saved sounds", () => {
  const older = {
    id: "00000000-0000-4000-8000-000000000001",
    savedAt: 100,
    settings: {
      ...DEFAULT_SOUND,
      name: "Older sound",
      layers: DEFAULT_SOUND.layers.map((layer) => {
        const oldLayer = { ...layer };
        delete oldLayer.delayMs;
        return oldLayer;
      }),
    },
  };
  const oldFormat = {
    id: "00000000-0000-4000-8000-000000000003",
    savedAt: 150,
    settings: legacy,
  };
  const newer = {
    id: "00000000-0000-4000-8000-000000000002",
    savedAt: 200,
    settings: { ...DEFAULT_SOUND, name: "Newer sound" },
  };
  const invalid = {
    ...newer,
    id: "not-a-uuid",
    settings: {
      ...DEFAULT_SOUND,
      layers: [{ ...DEFAULT_SOUND.layers[0], startFrequencyHz: 99_999 }],
    },
  };

  const result = parseSavedSounds([older, invalid, oldFormat, newer]);

  assert.deepEqual(
    result.sounds.map((sound) => sound.settings.name),
    ["Newer sound", "Old format", "Older sound"],
  );
  assert.equal(result.sounds[1].settings.version, 2);
  assert.equal(result.sounds[1].settings.layers[1].type, "noise");
  assert.equal(result.sounds[2].settings.layers[0].delayMs, 0);
  assert.equal(result.migrated.length, 1);
  assert.equal(result.invalidCount, 1);
});
