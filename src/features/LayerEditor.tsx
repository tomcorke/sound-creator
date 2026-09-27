import {
  MAX_SOUND_LAYERS,
  type FilterType,
  type OscillatorLayer,
  type SoundLayer,
  type Waveform,
} from "../sound.ts";
import { RangeControl } from "./RangeControl.tsx";

type LayerPatch =
  Partial<OscillatorLayer> | Partial<Extract<SoundLayer, { type: "noise" }>>;

type LayerEditorProps = {
  layer: SoundLayer;
  index: number;
  count: number;
  onChange(patch: LayerPatch): void;
  onMove(direction: -1 | 1): void;
  onDuplicate(): void;
  onRemove(): void;
};

const waveforms: Waveform[] = ["sine", "triangle", "square", "sawtooth"];
const filters: FilterType[] = ["highpass", "lowpass", "bandpass"];

export function LayerEditor({
  layer,
  index,
  count,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: LayerEditorProps) {
  const oscillator = layer.type === "oscillator";
  const label = oscillator ? "Oscillator" : "Filtered noise";

  return (
    <section className={`layer-card${layer.enabled ? "" : " is-muted"}`}>
      <div className="layer-heading">
        <div className="layer-title-wrap">
          <span
            className={`layer-mark ${oscillator ? "tone-mark" : "click-mark"}`}
            aria-hidden="true"
          >
            {oscillator ? "∿" : "•"}
          </span>
          <div>
            <h3>
              {label} {index + 1}
            </h3>
            <p>
              {oscillator ? "Pitch and waveform" : "Filter and noise envelope"}
            </p>
          </div>
        </div>
        <div className="layer-heading-actions">
          <div className="layer-order-actions">
            <button
              type="button"
              aria-label={`Move ${label.toLowerCase()} ${index + 1} up`}
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Move ${label.toLowerCase()} ${index + 1} down`}
              disabled={index === count - 1}
              onClick={() => onMove(1)}
            >
              ↓
            </button>
            <button
              type="button"
              aria-label={`Duplicate ${label.toLowerCase()} ${index + 1}`}
              disabled={count >= MAX_SOUND_LAYERS}
              onClick={onDuplicate}
            >
              +
            </button>
            <button
              type="button"
              aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
              onClick={onRemove}
            >
              ×
            </button>
          </div>
          <label className="layer-enable">
            <input
              type="checkbox"
              checked={layer.enabled}
              onChange={(event) =>
                onChange({ enabled: event.currentTarget.checked })
              }
              aria-label={`Enable ${label.toLowerCase()} ${index + 1}`}
            />
            <span>{layer.enabled ? "ON" : "OFF"}</span>
          </label>
        </div>
      </div>
      <div className="layer-fields">
        {oscillator ? (
          <>
            <label className="select-control">
              <span>Waveform</span>
              <select
                value={layer.waveform}
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
              value={layer.startFrequencyHz}
              min={100}
              max={1600}
              step={10}
              display={`${layer.startFrequencyHz} Hz`}
              onChange={(startFrequencyHz) => onChange({ startFrequencyHz })}
            />
            <RangeControl
              label="End pitch"
              value={layer.endFrequencyHz}
              min={50}
              max={1600}
              step={10}
              display={`${layer.endFrequencyHz} Hz`}
              onChange={(endFrequencyHz) => onChange({ endFrequencyHz })}
            />
            <RangeControl
              label="Pitch sweep"
              value={layer.sweepMs}
              min={5}
              max={150}
              step={1}
              display={`${layer.sweepMs} ms`}
              onChange={(sweepMs) => onChange({ sweepMs })}
            />
            <RangeControl
              label="Fade time"
              value={layer.fadeMs}
              min={5}
              max={2000}
              step={5}
              display={`${layer.fadeMs} ms`}
              onChange={(fadeMs) => onChange({ fadeMs })}
            />
            <RangeControl
              label="Duration"
              value={layer.durationMs}
              min={15}
              max={2000}
              step={5}
              display={`${layer.durationMs} ms`}
              onChange={(durationMs) => onChange({ durationMs })}
            />
          </>
        ) : (
          <>
            <label className="select-control">
              <span>Filter type</span>
              <select
                value={layer.filterType}
                onChange={(event) =>
                  onChange({
                    filterType: event.currentTarget.value as FilterType,
                  })
                }
              >
                {filters.map((filter) => (
                  <option key={filter} value={filter}>
                    {filter[0].toUpperCase() + filter.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <RangeControl
              label="Filter frequency"
              value={layer.filterFrequencyHz}
              min={200}
              max={6000}
              step={50}
              display={`${layer.filterFrequencyHz} Hz`}
              onChange={(filterFrequencyHz) => onChange({ filterFrequencyHz })}
            />
            <RangeControl
              label="Filter end frequency"
              value={layer.filterEndFrequencyHz ?? layer.filterFrequencyHz}
              min={200}
              max={6000}
              step={50}
              display={`${layer.filterEndFrequencyHz ?? layer.filterFrequencyHz} Hz`}
              onChange={(filterEndFrequencyHz) =>
                onChange({ filterEndFrequencyHz })
              }
            />
            <RangeControl
              label="Attack time"
              value={layer.attackMs ?? 0}
              min={0}
              max={2000}
              step={5}
              display={`${layer.attackMs ?? 0} ms`}
              onChange={(attackMs) => onChange({ attackMs })}
            />
            <RangeControl
              label="Fade time"
              value={layer.fadeMs}
              min={3}
              max={2000}
              step={5}
              display={`${layer.fadeMs} ms`}
              onChange={(fadeMs) => onChange({ fadeMs })}
            />
            <RangeControl
              label="Duration"
              value={layer.durationMs}
              min={3}
              max={2000}
              step={5}
              display={`${layer.durationMs} ms`}
              onChange={(durationMs) => onChange({ durationMs })}
            />
          </>
        )}
        <RangeControl
          label="Start delay"
          value={layer.delayMs}
          min={0}
          max={3000}
          step={5}
          display={`${layer.delayMs} ms`}
          onChange={(delayMs) => onChange({ delayMs })}
        />
        <RangeControl
          label="Level"
          value={layer.gain}
          min={0.01}
          max={0.3}
          step={0.01}
          display={`${Math.round(layer.gain * 100)}%`}
          onChange={(gain) => onChange({ gain })}
        />
      </div>
    </section>
  );
}
