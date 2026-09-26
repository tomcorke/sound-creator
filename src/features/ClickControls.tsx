import type { ClickSettings } from "../sound.ts";
import { RangeControl } from "./RangeControl.tsx";

type ClickControlsProps = {
  click: ClickSettings;
  onChange(patch: Partial<ClickSettings>): void;
};

export function ClickControls({ click, onChange }: ClickControlsProps) {
  return (
    <section
      className={`layer-card click-card${click.enabled ? "" : " is-muted"}`}
    >
      <div className="layer-heading">
        <div className="layer-title-wrap">
          <span className="layer-mark click-mark" aria-hidden="true">
            •
          </span>
          <div>
            <h3>Noise click</h3>
            <p>Filtered transient for the attack</p>
          </div>
        </div>
        <label className="layer-enable">
          <input
            type="checkbox"
            checked={click.enabled}
            onChange={(event) =>
              onChange({ enabled: event.currentTarget.checked })
            }
            aria-label="Enable noise click layer"
          />
          <span>{click.enabled ? "ON" : "OFF"}</span>
        </label>
      </div>
      <div className="layer-fields click-fields">
        <RangeControl
          label="High-pass filter"
          value={click.highpassHz}
          min={200}
          max={6000}
          step={50}
          display={`${click.highpassHz} Hz`}
          onChange={(highpassHz) => onChange({ highpassHz })}
        />
        <RangeControl
          label="Duration"
          value={click.durationMs}
          min={3}
          max={60}
          step={1}
          display={`${click.durationMs} ms`}
          onChange={(durationMs) => onChange({ durationMs })}
        />
        <RangeControl
          label="Level"
          value={click.gain}
          min={0.01}
          max={0.25}
          step={0.01}
          display={`${Math.round(click.gain * 100)}%`}
          onChange={(gain) => onChange({ gain })}
        />
      </div>
    </section>
  );
}
