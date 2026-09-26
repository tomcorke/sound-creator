import type { SoundSettings } from "../sound.ts";

type ExportPanelProps = {
  settings: SoundSettings;
  json: string;
  status: string;
  onCopy(): void;
  onDownload(): void;
};

export function ExportPanel({
  settings,
  json,
  status,
  onCopy,
  onDownload,
}: ExportPanelProps) {
  return (
    <section className="export-panel" aria-label="Export settings as JSON">
      <div className="monitor-heading export-heading">
        <div>
          <span className="section-index">03 / EXPORT</span>
          <h2>Settings blob</h2>
        </div>
        <span className="json-tag">JSON</span>
      </div>
      <p className="export-copy">
        Versioned settings, ready to drop into another Web Audio app.
      </p>
      <textarea
        aria-label="Exported sound settings JSON"
        className="json-output"
        readOnly
        rows={17}
        spellCheck={false}
        value={json}
        onFocus={(event) => event.currentTarget.select()}
      />
      <div className="export-actions">
        <button className="copy-button" type="button" onClick={onCopy}>
          Copy JSON
        </button>
        <button className="download-button" type="button" onClick={onDownload}>
          Download .json
        </button>
      </div>
      <p className="export-status" role="status">
        {status || `Exporting “${settings.name}”`}
      </p>
    </section>
  );
}
