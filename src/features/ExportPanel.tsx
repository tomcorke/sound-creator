import type { SoundSettings } from "../sound.ts";

const repoUrl = "https://github.com/tomcorke/sound-creator";

type ExportPanelProps = {
  settings: SoundSettings;
  json: string;
  status: string;
  onCopy(text: string, label: string): void;
  onDownload(): void;
};

function agentPrompt(json: string) {
  return `Add this sound to my app. It was made with Sound Creator (${repoUrl}).

Read these files in that repository before implementing:
- docs/SOUND_FORMAT.md: the settings format, field ranges, and how to play a sound.
- src/sound.ts: the reference implementation, with the Zod schema (isSoundSettings) and Web Audio playback (playSound).
- docs/examples/: usage examples, including vanilla JavaScript (vanilla.js) and a React button (react-sound-button.tsx).

Copy src/sound.ts into the project, or port it faithfully if the project does not use TypeScript, and add the zod dependency. Validate the settings before playback and start playback from a user action so browsers allow audio.

Sound settings JSON:

${json}
`;
}

export function ExportPanel({
  settings,
  json,
  status,
  onCopy,
  onDownload,
}: ExportPanelProps) {
  const prompt = agentPrompt(json);
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
        <button
          className="copy-button"
          type="button"
          onClick={() => onCopy(json, "JSON")}
        >
          Copy JSON
        </button>
        <button className="download-button" type="button" onClick={onDownload}>
          Download .json
        </button>
      </div>
      <details className="agent-prompt">
        <summary>Instructions for a coding agent</summary>
        <p className="export-copy">
          Paste this into a coding agent. It points to the format docs and
          reference player, and includes the JSON.
        </p>
        <textarea
          aria-label="Coding agent instructions"
          className="json-output"
          readOnly
          rows={12}
          spellCheck={false}
          value={prompt}
          onFocus={(event) => event.currentTarget.select()}
        />
        <button
          className="download-button agent-copy"
          type="button"
          onClick={() => onCopy(prompt, "agent instructions")}
        >
          Copy agent instructions
        </button>
      </details>
      <p className="export-status" role="status">
        {status || `Exporting “${settings.name}”`}
      </p>
    </section>
  );
}
