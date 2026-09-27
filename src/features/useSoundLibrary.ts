import { useEffect, useState } from "react";
import {
  deleteSavedSound,
  getSavedSounds,
  saveSound as persistSound,
} from "../sound-library.ts";
import type { SavedSound } from "../sound-library-schema.ts";
import type { SoundSettings } from "../sound.ts";

export function useSoundLibrary() {
  const [sounds, setSounds] = useState<SavedSound[]>([]);
  const [status, setStatus] = useState("Loading saved sounds…");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getSavedSounds();
        if (!active) return;
        setSounds(result.sounds);
        const notices = [
          result.migratedCount &&
            !result.migrationFailed &&
            `Updated ${result.migratedCount} saved sound format${result.migratedCount === 1 ? "" : "s"}.`,
          result.invalidCount &&
            `Skipped ${result.invalidCount} invalid saved sound${result.invalidCount === 1 ? "" : "s"}.`,
          result.migrationFailed &&
            "Loaded old sounds, but could not update their stored format.",
        ].filter(Boolean);
        setStatus(
          notices.join(" ") ||
            (result.sounds.length
              ? `${result.sounds.length} saved ${result.sounds.length === 1 ? "sound" : "sounds"}.`
              : "No saved sounds yet."),
        );
      } catch {
        if (active) setStatus("Could not read this browser’s sound library.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  async function save(settings: SoundSettings) {
    setSaving(true);
    setStatus("Saving to this browser…");
    try {
      const sound = await persistSound(settings);
      setSounds((current) => [sound, ...current]);
      setStatus(`Saved “${sound.settings.name || "Untitled sound"}”.`);
    } catch {
      setStatus("Could not save this sound to IndexedDB.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteSavedSound(id);
      setSounds((current) => current.filter((sound) => sound.id !== id));
      setStatus("Sound removed from this browser’s library.");
    } catch {
      setStatus("Could not delete this saved sound.");
    }
  }

  return { sounds, status, loading, saving, save, remove };
}
