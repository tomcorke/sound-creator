import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SOUND } from "../src/sound.ts";
import { parseSavedSounds } from "../src/sound-library-schema.ts";

test("validates library records and sorts valid sounds newest first", () => {
  const older = {
    id: "00000000-0000-4000-8000-000000000001",
    savedAt: 100,
    settings: { ...DEFAULT_SOUND, name: "Older sound" },
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
      tone: { ...DEFAULT_SOUND.tone, startFrequencyHz: 99_999 },
    },
  };

  const result = parseSavedSounds([older, invalid, newer]);

  assert.deepEqual(
    result.sounds.map((sound) => sound.settings.name),
    ["Newer sound", "Older sound"],
  );
  assert.equal(result.invalidCount, 1);
});
