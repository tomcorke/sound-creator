import { useMemo, useState } from "react";
import { AppChrome } from "./features/AppChrome.tsx";
import { StudioWorkspace } from "./features/StudioWorkspace.tsx";
import {
  DEFAULT_SOUND,
  playSound,
  PRESETS,
  type ClickSettings,
  type ToneSettings,
} from "./sound.ts";
import "./App.css";
import "./output.css";
import "./responsive.css";

function App() {
  const [settings, setSettings] = useState(DEFAULT_SOUND);
  const [playStatus, setPlayStatus] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const json = useMemo(() => JSON.stringify(settings, null, 2), [settings]);

  function updateTone(patch: Partial<ToneSettings>) {
    setSettings((current) => ({
      ...current,
      tone: { ...current.tone, ...patch },
    }));
    setExportStatus("");
  }

  function updateClick(patch: Partial<ClickSettings>) {
    setSettings((current) => ({
      ...current,
      click: { ...current.click, ...patch },
    }));
    setExportStatus("");
  }

  function selectPreset(name: string) {
    const preset = PRESETS[name];
    if (preset) {
      setSettings(structuredClone(preset));
      setPlayStatus("");
      setExportStatus("");
    }
  }

  function updateName(name: string) {
    setSettings((current) => ({ ...current, name }));
    setExportStatus("");
  }

  function preview() {
    if (!settings.tone.enabled && !settings.click.enabled) {
      setPlayStatus("Enable a layer to preview this sound.");
      return;
    }
    setPlayStatus(
      playSound(settings)
        ? "Playing current settings."
        : "Web Audio is not available in this browser.",
    );
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json);
      setExportStatus("JSON copied to clipboard.");
    } catch {
      setExportStatus(
        "Clipboard unavailable. Select the JSON above to copy it.",
      );
    }
  }

  function downloadJson() {
    const fileName =
      settings.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "sound";
    const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportStatus("JSON file downloaded.");
  }

  return (
    <AppChrome>
      <main className="studio">
        <StudioWorkspace
          settings={settings}
          json={json}
          playStatus={playStatus}
          exportStatus={exportStatus}
          onPresetChange={selectPreset}
          onNameChange={updateName}
          onToneChange={updateTone}
          onClickChange={updateClick}
          onPreview={preview}
          onCopy={copyJson}
          onDownload={downloadJson}
        />
      </main>
    </AppChrome>
  );
}

export default App;
