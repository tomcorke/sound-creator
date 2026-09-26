import { z } from "zod";
import { SoundSettingsSchema } from "./sound.ts";

export const SavedSoundSchema = z
  .object({
    id: z.string().uuid(),
    savedAt: z.number().int().min(0).max(8.64e15),
    settings: SoundSettingsSchema,
  })
  .strict();

export type SavedSound = z.infer<typeof SavedSoundSchema>;

export function parseSavedSounds(records: unknown[]) {
  const sounds: SavedSound[] = [];
  let invalidCount = 0;

  for (const record of records) {
    const result = SavedSoundSchema.safeParse(record);
    if (result.success) sounds.push(result.data);
    else invalidCount++;
  }

  sounds.sort((left, right) => right.savedAt - left.savedAt);
  return { sounds, invalidCount };
}
