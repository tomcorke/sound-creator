import type { SavedSound } from "../sound-library-schema.ts";
import type { SoundSettings } from "../sound.ts";

type LibraryPanelProps = {
  sounds: SavedSound[];
  status: string;
  loading: boolean;
  saving: boolean;
  onSave(): void;
  onLoad(settings: SoundSettings): void;
  onDelete(id: string): void;
};

export function LibraryPanel({
  sounds,
  status,
  loading,
  saving,
  onSave,
  onLoad,
  onDelete,
}: LibraryPanelProps) {
  return (
    <section className="library-panel" aria-label="Saved sound library">
      <div className="monitor-heading">
        <div>
          <span className="section-index">04 / LIBRARY</span>
          <h2>Saved sounds</h2>
        </div>
        <span className="json-tag">{sounds.length} SAVED</span>
      </div>
      <p className="library-copy">Stored in this browser with IndexedDB.</p>
      <button
        className="library-save-button"
        type="button"
        disabled={loading || saving}
        onClick={onSave}
      >
        {saving ? "Saving…" : "Save current sound"}
      </button>
      <p className="library-status" role="status">
        {status}
      </p>
      {!loading && sounds.length === 0 ? (
        <p className="library-empty">Your saved sounds will appear here.</p>
      ) : null}
      {sounds.length > 0 ? (
        <ul className="library-list">
          {sounds.map((sound) => {
            const name = sound.settings.name || "Untitled sound";
            return (
              <li className="library-item" key={sound.id}>
                <div className="library-item-info">
                  <strong>{name}</strong>
                  <time dateTime={new Date(sound.savedAt).toISOString()}>
                    {new Date(sound.savedAt).toLocaleString()}
                  </time>
                </div>
                <div className="library-item-actions">
                  <button
                    className="library-load-button"
                    type="button"
                    aria-label={`Load ${name}`}
                    onClick={() => onLoad(sound.settings)}
                  >
                    Load
                  </button>
                  <button
                    className="library-delete-button"
                    type="button"
                    aria-label={`Delete ${name}`}
                    onClick={() => {
                      if (window.confirm(`Delete “${name}” from this library?`))
                        onDelete(sound.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
