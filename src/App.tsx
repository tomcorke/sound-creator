import { useMemo } from "react";
import { AppChrome } from "./features/AppChrome.tsx";
import { StudioWorkspace } from "./features/StudioWorkspace.tsx";
import { useSoundEditor } from "./features/useSoundEditor.ts";
import { useSoundLibrary } from "./features/useSoundLibrary.ts";
import "./App.css";
import "./editor-controls.css";
import "./output.css";
import "./responsive.css";

function App() {
  const editor = useSoundEditor();
  const library = useSoundLibrary();
  const json = useMemo(
    () => JSON.stringify(editor.settings, null, 2),
    [editor.settings],
  );

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json);
      editor.setExportStatus("JSON copied to clipboard.");
    } catch {
      editor.setExportStatus(
        "Clipboard unavailable. Select the JSON above to copy it.",
      );
    }
  }

  function downloadJson() {
    const fileName =
      editor.settings.name
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
    editor.setExportStatus("JSON file downloaded.");
  }

  return (
    <AppChrome>
      <main className="studio">
        <StudioWorkspace
          settings={editor.settings}
          json={json}
          playStatus={editor.playStatus}
          exportStatus={editor.exportStatus}
          savedSounds={library.sounds}
          libraryStatus={library.status}
          libraryLoading={library.loading}
          librarySaving={library.saving}
          onReset={editor.reset}
          onNameChange={editor.updateName}
          onLayerChange={editor.updateLayer}
          onAddLayer={editor.addLayer}
          onMoveLayer={editor.moveLayer}
          onDuplicateLayer={editor.duplicateLayer}
          onRemoveLayer={editor.removeLayer}
          onApplyAnalysis={editor.applyLayers}
          onPreview={editor.preview}
          onCopy={() => void copyJson()}
          onDownload={downloadJson}
          onSaveSound={() => library.save(editor.settings)}
          onLoadSound={editor.load}
          onDeleteSound={library.remove}
        />
      </main>
    </AppChrome>
  );
}

export default App;
