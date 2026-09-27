import { z } from "zod";
import {
  LegacySoundSettingsSchema,
  SoundSettingsSchema,
  migrateSoundSettings,
} from "./sound.ts";

const recordFields = {
  id: z.string().uuid(),
  savedAt: z.number().int().min(0).max(8.64e15),
};

export const SavedSoundSchema = z
  .object({ ...recordFields, settings: SoundSettingsSchema })
  .strict();

const LegacySavedSoundSchema = z
  .object({ ...recordFields, settings: LegacySoundSettingsSchema })
  .strict();

export type SavedSound = z.infer<typeof SavedSoundSchema>;

export function parseSavedSounds(records: unknown[]) {
  const sounds: SavedSound[] = [];
  const migrated: SavedSound[] = [];
  let invalidCount = 0;

  for (const record of records) {
    const current = SavedSoundSchema.safeParse(record);
    if (current.success) {
      sounds.push(current.data);
      continue;
    }

    const legacy = LegacySavedSoundSchema.safeParse(record);
    if (!legacy.success) {
      invalidCount++;
      continue;
    }

    const settings = migrateSoundSettings(legacy.data.settings);
    if (!settings) {
      invalidCount++;
      continue;
    }
    const sound = { ...legacy.data, settings };
    sounds.push(sound);
    migrated.push(sound);
  }

  sounds.sort((left, right) => right.savedAt - left.savedAt);
  return { sounds, migrated, invalidCount };
}
