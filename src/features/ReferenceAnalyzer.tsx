import { useEffect, useState } from "react";
import { analyzeAudioFile, type AudioAnalysis } from "../audio-analysis.ts";
import type { SoundLayer } from "../sound.ts";

type ReferenceAnalyzerProps = {
  onApply(layers: SoundLayer[]): void;
};

export function ReferenceAnalyzer({ onApply }: ReferenceAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [status, setStatus] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const eventSummary =
    analysis?.events
      ?.map((event) => `${event.delayMs} ms / ${event.durationMs} ms`)
      .join(", ") ?? "";
  const peakSummary = analysis?.peakFrequenciesHz?.slice(0, 8).join(", ") ?? "";

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  async function analyze() {
    if (!file) return;
    setAnalyzing(true);
    setStatus("Analyzing audio locally…");
    try {
      setAnalysis(await analyzeAudioFile(file));
      setStatus(
        "Analysis ready. Listen to the reference, then compare your sound.",
      );
    } catch (error) {
      setAnalysis(null);
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not analyze this audio file.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function applyAnalysis() {
    if (!analysis) return;
    onApply(analysis.layers);
    setStatus(`Applied ${analysis.layers.length} suggested layers.`);
  }

  function selectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0] ?? null;
    setFile(selected);
    setUrl(selected ? URL.createObjectURL(selected) : "");
    setAnalysis(null);
    setStatus(selected ? "Ready to analyze. File stays in this browser." : "");
  }

  return (
    <section className="reference-panel" aria-label="Analyze reference audio">
      <div className="reference-heading">
        <div>
          <span className="section-index">REFERENCE / LOCAL FILE</span>
          <h3>Analyze a sound</h3>
        </div>
        <span className="local-tag">NO UPLOAD</span>
      </div>
      <p className="reference-copy">
        Choose a short recording to find resonant frequencies and suggest
        layers.
      </p>
      <label className="file-control">
        <span>Audio file</span>
        <input type="file" accept="audio/*" onChange={selectFile} />
      </label>
      {url && (
        <audio
          aria-label="Reference audio playback"
          className="reference-audio"
          controls
          src={url}
        />
      )}
      <button
        className="analyze-button"
        type="button"
        onClick={() => void analyze()}
        disabled={!file || analyzing}
      >
        {analyzing ? "Analyzing…" : "Analyze file"}
      </button>
      {analysis && (
        <div className="analysis-result">
          <p>
            File{" "}
            {analysis.durationMs >= 1000
              ? `${(analysis.durationMs / 1000).toFixed(2)} s`
              : `${analysis.durationMs} ms`}
            {` · events (start/duration): ${eventSummary}`}
            {" · "}
            {analysis.peakFrequenciesHz.length
              ? `Peaks: ${peakSummary}${analysis.peakFrequenciesHz.length > 8 ? "…" : ""} Hz`
              : "No clear pitched peaks"}
          </p>
          <button
            className="apply-analysis-button"
            type="button"
            onClick={applyAnalysis}
          >
            Use {analysis.layers.length} suggested layers
          </button>
        </div>
      )}
      <p className="reference-status" role="status">
        {status}
      </p>
    </section>
  );
}
