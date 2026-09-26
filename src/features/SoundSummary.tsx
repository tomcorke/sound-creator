import type { SoundSettings } from "../sound.ts";

type SoundSummaryProps = {
  settings: SoundSettings;
  status: string;
};

export function SoundSummary({ settings, status }: SoundSummaryProps) {
  const activeLayers =
    Number(settings.tone.enabled) + Number(settings.click.enabled);

  return (
    <section className="monitor-panel" aria-label="Sound preview summary">
      <div className="monitor-heading">
        <div>
          <span className="section-index">02 / MONITOR</span>
          <h2>Signal path</h2>
        </div>
        <span className="live-indicator">
          <i /> READY
        </span>
      </div>
      <div className="signal-display" aria-hidden="true">
        <div className="signal-grid" />
        <div className="signal-bars">
          {[
            18, 30, 22, 48, 36, 64, 43, 82, 56, 100, 72, 48, 67, 33, 52, 26, 39,
            18,
          ].map((height, index) => (
            <i key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
        <span className="signal-caption">WEB AUDIO / REAL-TIME SYNTHESIS</span>
      </div>
      <div className="summary-readout">
        <div>
          <span className="readout-label">ACTIVE LAYERS</span>
          <strong>
            {activeLayers} <small>/ 2</small>
          </strong>
        </div>
        <div>
          <span className="readout-label">TONE RANGE</span>
          <strong>
            {settings.tone.startFrequencyHz} <small>to</small>{" "}
            {settings.tone.endFrequencyHz}
            <small> Hz</small>
          </strong>
        </div>
        <div>
          <span className="readout-label">NOISE FILTER</span>
          <strong>
            {settings.click.highpassHz}
            <small> Hz</small>
          </strong>
        </div>
      </div>
      <p className="play-status" role="status">
        {status || "Adjust a layer, then play your sound."}
      </p>
    </section>
  );
}
