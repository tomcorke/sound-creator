import type { ToneSettings, Waveform } from "../sound.ts";
import { RangeControl } from "./RangeControl.tsx";

const waveforms: Waveform[] = ["sine", "triangle", "square", "sawtooth"];

type ToneControlsProps = {
  tone: ToneSettings;
  onChange(patch: Partial<ToneSettings>): void;
};

export function ToneControls({ tone, onChange }: ToneControlsProps) {
  return (
    <section
      className={`layer-card tone-card${tone.enabled ? "" : " is-muted"}`}
    >
      <div className="layer-heading">
        <div className="layer-title-wrap">
          <span className="layer-mark tone-mark" aria-hidden="true">
            ∿
          </span>
          <div>
            <h3>Tone</h3>
            <p>Oscillator pitch and shape</p>
          </div>
        </div>
        <label className="layer-enable">
          <input
            type="checkbox"
            checked={tone.enabled}
            onChange={(event) =>
              onChange({ enabled: event.currentTarget.checked })
            }
            aria-label="Enable tone layer"
          />
          <span>{tone.enabled ? "ON" : "OFF"}</span>
        </label>
      </div>
      <div className="layer-fields">
        <label className="select-control">
          <span>Waveform</span>
          <select
            value={tone.waveform}
            onChange={(event) =>
              onChange({ waveform: event.currentTarget.value as Waveform })
            }
          >
            {waveforms.map((waveform) => (
              <option key={waveform} value={waveform}>
                {waveform[0].toUpperCase() + waveform.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <RangeControl
          label="Start pitch"
          value={tone.startFrequencyHz}
          min={100}
          max={1600}
          step={10}
          display={`${tone.startFrequencyHz} Hz`}
          onChange={(startFrequencyHz) => onChange({ startFrequencyHz })}
        />
        <RangeControl
          label="End pitch"
          value={tone.endFrequencyHz}
          min={50}
          max={1600}
          step={10}
          display={`${tone.endFrequencyHz} Hz`}
          onChange={(endFrequencyHz) => onChange({ endFrequencyHz })}
        />
        <RangeControl
          label="Pitch sweep"
          value={tone.sweepMs}
          min={5}
          max={150}
          step={1}
          display={`${tone.sweepMs} ms`}
          onChange={(sweepMs) => onChange({ sweepMs })}
        />
        <RangeControl
          label="Fade time"
          value={tone.fadeMs}
          min={5}
          max={300}
          step={1}
          display={`${tone.fadeMs} ms`}
          onChange={(fadeMs) => onChange({ fadeMs })}
        />
        <RangeControl
          label="Duration"
          value={tone.durationMs}
          min={15}
          max={300}
          step={1}
          display={`${tone.durationMs} ms`}
          onChange={(durationMs) => onChange({ durationMs })}
        />
        <RangeControl
          label="Level"
          value={tone.gain}
          min={0.01}
          max={0.3}
          step={0.01}
          display={`${Math.round(tone.gain * 100)}%`}
          onChange={(gain) => onChange({ gain })}
        />
      </div>
    </section>
  );
}
