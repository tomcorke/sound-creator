type RangeControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange(value: number): void;
};

export function RangeControl({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: RangeControlProps) {
  return (
    <label className="range-control">
      <span className="range-heading">
        <span>{label}</span>
        <output>{display}</output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}
