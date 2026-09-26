import {
  PRESETS as settingsPresets,
  type ClickSettings,
  type SoundSettings,
  type ToneSettings,
} from "../sound.ts";
import { ClickControls } from "./ClickControls.tsx";
import { ExportPanel } from "./ExportPanel.tsx";
import { SoundSummary } from "./SoundSummary.tsx";
import { ToneControls } from "./ToneControls.tsx";

type StudioWorkspaceProps = {
  settings: SoundSettings;
  json: string;
  playStatus: string;
  exportStatus: string;
  onPresetChange(name: string): void;
  onNameChange(name: string): void;
  onToneChange(patch: Partial<ToneSettings>): void;
  onClickChange(patch: Partial<ClickSettings>): void;
  onPreview(): void;
  onCopy(): void;
  onDownload(): void;
};

export function StudioWorkspace({
  settings,
  json,
  playStatus,
  exportStatus,
  onPresetChange,
  onNameChange,
  onToneChange,
  onClickChange,
  onPreview,
  onCopy,
  onDownload,
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
            Layer a pitched tone with a filtered click. Test it here, then take
            the JSON into your app.
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
            <label className="preset-control">
              <span>Start from</span>
              <select
                value=""
                onChange={(event) => onPresetChange(event.currentTarget.value)}
                aria-label="Load a starting preset"
              >
                <option value="">Choose preset</option>
                {Object.keys(settingsPresets).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
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
          <ToneControls tone={settings.tone} onChange={onToneChange} />
          <ClickControls click={settings.click} onChange={onClickChange} />
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
        </aside>
      </div>
    </>
  );
}
