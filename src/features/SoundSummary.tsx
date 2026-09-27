import type { SoundSettings } from "../sound.ts";
import { createLayerTimeline } from "./layer-timeline.ts";

const TIMELINE_TICKS = [0, 0.25, 0.5, 0.75, 1];

type SoundSummaryProps = {
  settings: SoundSettings;
  status: string;
};

export function SoundSummary({ settings, status }: SoundSummaryProps) {
  const activeLayers = settings.layers.filter((layer) => layer.enabled);
  const oscillators = activeLayers.filter(
    (layer) => layer.type === "oscillator",
  );
  const noiseLayers = activeLayers.filter((layer) => layer.type === "noise");
  const frequencies = oscillators.flatMap((layer) => [
    layer.startFrequencyHz,
    layer.endFrequencyHz,
  ]);
  const lowestFrequency = frequencies.length ? Math.min(...frequencies) : null;
  const highestFrequency = frequencies.length ? Math.max(...frequencies) : null;
  const timeline = createLayerTimeline(settings.layers);

  return (
    <section className="monitor-panel" aria-label="Sound preview summary">
      <div className="monitor-heading">
        <div>
          <span className="section-index">02 / MONITOR</span>
          <h2>Layer timeline</h2>
        </div>
        <span className="live-indicator">
          <i /> READY
        </span>
      </div>
      <div
        className="signal-display"
        role="img"
        aria-label={`Layer timeline from 0 to ${timeline.endMs} milliseconds. Bar start is delay, width is duration, height is level.`}
      >
        <div className="timeline-axis">
          <span className="timeline-axis-title">TIME</span>
          <div className="timeline-ruler">
            {TIMELINE_TICKS.map((fraction) => (
              <span
                key={fraction}
                className={`timeline-tick ${fraction === 0 ? "tick-start" : fraction === 1 ? "tick-end" : ""}`}
                style={{ left: `${fraction * 100}%` }}
              >
                {Math.round(timeline.endMs * fraction)} ms
              </span>
            ))}
          </div>
        </div>
        <div className="timeline-rows">
          {timeline.layers.map(
            ({ layer, startFraction, durationFraction }, index) => {
              const height = Math.max(2, Math.min(8, (layer.gain / 0.3) * 8));
              return (
                <div className="timeline-row" key={layer.id}>
                  <span className="timeline-index">{index + 1}</span>
                  <div className="timeline-track">
                    <span
                      className={`timeline-bar ${layer.type === "noise" ? "timeline-noise" : "timeline-oscillator"}`}
                      style={{
                        left: `${startFraction * 100}%`,
                        width: `${durationFraction * 100}%`,
                        height: `${height}px`,
                        opacity: layer.enabled ? 1 : 0.2,
                      }}
                      title={`Layer ${index + 1}, ${layer.type}; starts at ${layer.delayMs} ms; duration ${layer.durationMs} ms; gain ${layer.gain}.`}
                    />
                  </div>
                </div>
              );
            },
          )}
          {!timeline.layers.length && (
            <span className="timeline-empty">No layers</span>
          )}
        </div>
      </div>
      <div className="timeline-legend" aria-label="Timeline legend">
        <span>
          <i className="timeline-key timeline-oscillator" /> OSCILLATOR
        </span>
        <span>
          <i className="timeline-key timeline-noise" /> NOISE
        </span>
        <span className="timeline-hint">
          START = DELAY · WIDTH = DURATION · HEIGHT = LEVEL
          {settings.layers.length > timeline.layers.length &&
            ` · SHOWING ${timeline.layers.length}/${settings.layers.length}`}
        </span>
      </div>
      <div className="summary-readout">
        <div>
          <span className="readout-label">ACTIVE LAYERS</span>
          <strong>
            {activeLayers.length} <small>/ {settings.layers.length}</small>
          </strong>
        </div>
        <div>
          <span className="readout-label">OSCILLATOR SPAN</span>
          <strong>
            {lowestFrequency ?? "—"}
            {highestFrequency !== null &&
              highestFrequency !== lowestFrequency && (
                <small>–{highestFrequency}</small>
              )}
            {frequencies.length > 0 && <small> Hz</small>}
          </strong>
        </div>
        <div>
          <span className="readout-label">NOISE LAYERS</span>
          <strong>{noiseLayers.length}</strong>
        </div>
      </div>
      <p className="play-status" role="status">
        {status || "Adjust a layer, then play your sound."}
      </p>
    </section>
  );
}
