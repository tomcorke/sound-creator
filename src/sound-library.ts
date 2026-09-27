import {
  parseSavedSounds,
  SavedSoundSchema,
  type SavedSound,
} from "./sound-library-schema.ts";
import { SoundSettingsSchema, type SoundSettings } from "./sound.ts";

const DATABASE_NAME = "sound-creator-library";
const STORE_NAME = "sounds";
const DATABASE_VERSION = 1;

export async function getSavedSounds() {
  const records = await transact<unknown[]>(
    "readonly",
    (store) => store.getAll() as IDBRequest<unknown[]>,
  );
  const result = parseSavedSounds(records);
  let migrationFailed = false;
  if (result.migrated.length) {
    try {
      await transact("readwrite", (store) => {
        let request = store.put(result.migrated[0]);
        for (const sound of result.migrated.slice(1))
          request = store.put(sound);
        return request;
      });
    } catch {
      migrationFailed = true;
    }
  }
  return {
    sounds: result.sounds,
    invalidCount: result.invalidCount,
    migratedCount: result.migrated.length,
    migrationFailed,
  };
}

export async function saveSound(settings: SoundSettings): Promise<SavedSound> {
  const sound = SavedSoundSchema.parse({
    id: crypto.randomUUID(),
    savedAt: Date.now(),
    settings: SoundSettingsSchema.parse(settings),
  });
  await transact("readwrite", (store) => store.add(sound));
  return sound;
}

export async function deleteSavedSound(id: string): Promise<void> {
  await transact("readwrite", (store) => store.delete(id));
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined")
    return Promise.reject(new Error("IndexedDB is unavailable."));

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME))
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open sound library."));
  });
}

function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        let result: T;
        let finished = false;
        const fail = (error: unknown) => {
          if (finished) return;
          finished = true;
          database.close();
          reject(
            error instanceof Error
              ? error
              : new Error("Sound library transaction failed."),
          );
        };

        try {
          const request = operation(transaction.objectStore(STORE_NAME));
          request.onsuccess = () => {
            result = request.result;
          };
          transaction.oncomplete = () => {
            if (finished) return;
            finished = true;
            database.close();
            resolve(result);
          };
          transaction.onerror = () => fail(transaction.error);
          transaction.onabort = () => fail(transaction.error);
        } catch (error) {
          fail(error);
        }
      }),
  );
}
