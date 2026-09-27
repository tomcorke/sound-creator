import type { SavedSound } from "../sound-library-schema.ts";
import {
  MAX_SOUND_LAYERS,
  type SoundLayer,
  type SoundSettings,
} from "../sound.ts";
import { ExportPanel } from "./ExportPanel.tsx";
import { LayerEditor } from "./LayerEditor.tsx";
import { LibraryPanel } from "./LibraryPanel.tsx";
import { ReferenceAnalyzer } from "./ReferenceAnalyzer.tsx";
import { SoundSummary } from "./SoundSummary.tsx";

type StudioWorkspaceProps = {
  settings: SoundSettings;
  json: string;
  playStatus: string;
  exportStatus: string;
  savedSounds: SavedSound[];
  libraryStatus: string;
  libraryLoading: boolean;
  librarySaving: boolean;
  onReset(): void;
  onNameChange(name: string): void;
  onLayerChange(id: string, patch: Partial<SoundLayer>): void;
  onAddLayer(type: SoundLayer["type"]): void;
  onMoveLayer(id: string, direction: -1 | 1): void;
  onDuplicateLayer(id: string): void;
  onRemoveLayer(id: string): void;
  onApplyAnalysis(layers: SoundLayer[]): void;
  onPreview(): void;
  onCopy(): void;
  onDownload(): void;
  onSaveSound(): void;
  onLoadSound(settings: SoundSettings): void;
  onDeleteSound(id: string): void;
};

export function StudioWorkspace({
  settings,
  json,
  playStatus,
  exportStatus,
  savedSounds,
  libraryStatus,
  libraryLoading,
  librarySaving,
  onReset,
  onNameChange,
  onLayerChange,
  onAddLayer,
  onMoveLayer,
  onDuplicateLayer,
  onRemoveLayer,
  onApplyAnalysis,
  onPreview,
  onCopy,
  onDownload,
  onSaveSound,
  onLoadSound,
  onDeleteSound,
}: StudioWorkspaceProps) {
  return (
    <>
      <section className="intro">
        <div>
          <p className="eyebrow">
            BROWSER SOUND DESIGNER <span>—</span> WEB AUDIO API
          </p>
          <h1>
            Shape the sound.
            <br />
            <span className="intro-highlight">Keep the settings.</span>
          </h1>
          <p className="intro-copy">
            Analyze a reference, build with as many layers as you need, then
            take the JSON into your app.
          </p>
        </div>
        <button className="play-button" type="button" onClick={onPreview}>
          <span className="play-icon" aria-hidden="true">
            ▶
          </span>
          Test sound
          <span className="button-shortcut">PLAY</span>
        </button>
      </section>

      <div className="studio-grid">
        <section className="controls-panel" aria-label="Sound controls">
          <div className="panel-heading">
            <div>
              <span className="section-index">01 / DESIGN</span>
              <h2>Sound settings</h2>
            </div>
            <button className="reset-button" type="button" onClick={onReset}>
              Reset to Scrabble tile
            </button>
          </div>
          <label className="name-control">
            <span>Sound name</span>
            <input
              type="text"
              maxLength={48}
              value={settings.name}
              onChange={(event) => onNameChange(event.currentTarget.value)}
              placeholder="Name this sound"
            />
          </label>
          <ReferenceAnalyzer onApply={onApplyAnalysis} />
          <div className="layer-toolbar">
            <div>
              <h3>Layers</h3>
              <p>
                {settings.layers.length} / {MAX_SOUND_LAYERS}
              </p>
            </div>
            <div className="layer-add-actions">
              <button
                type="button"
                onClick={() => onAddLayer("oscillator")}
                disabled={settings.layers.length >= MAX_SOUND_LAYERS}
              >
                + Oscillator
              </button>
              <button
                type="button"
                onClick={() => onAddLayer("noise")}
                disabled={settings.layers.length >= MAX_SOUND_LAYERS}
              >
                + Filtered noise
              </button>
            </div>
          </div>
          {settings.layers.map((layer, index) => (
            <LayerEditor
              key={layer.id}
              layer={layer}
              index={index}
              count={settings.layers.length}
              onChange={(patch) => onLayerChange(layer.id, patch)}
              onMove={(direction) => onMoveLayer(layer.id, direction)}
              onDuplicate={() => onDuplicateLayer(layer.id)}
              onRemove={() => onRemoveLayer(layer.id)}
            />
          ))}
          {!settings.layers.length && (
            <p className="empty-layers">
              Add an oscillator or filtered-noise layer.
            </p>
          )}
        </section>

        <aside className="output-column">
          <SoundSummary settings={settings} status={playStatus} />
          <ExportPanel
            settings={settings}
            json={json}
            status={exportStatus}
            onCopy={onCopy}
            onDownload={onDownload}
          />
          <LibraryPanel
            sounds={savedSounds}
            status={libraryStatus}
            loading={libraryLoading}
            saving={librarySaving}
            onSave={onSaveSound}
            onLoad={onLoadSound}
            onDelete={onDeleteSound}
          />
        </aside>
      </div>
    </>
  );
}
