export type DetectedEvent = {
  delayMs: number;
  durationMs: number;
  attackMs: number;
  peakRms: number;
  sampleIndex: number;
  envelope: number[];
};

function rmsWindows(samples: Float32Array, windowSize: number) {
  const levels: number[] = [];
  for (let start = 0; start < samples.length; start += windowSize) {
    const length = Math.min(windowSize, samples.length - start);
    let energy = 0;
    for (let index = 0; index < length; index++)
      energy += samples[start + index] ** 2;
    levels.push(Math.sqrt(energy / length));
  }
  return levels;
}

function eventRanges(levels: number[], maximum: number) {
  const ranges: { start: number; end: number }[] = [];
  let start = -1;
  let end = -1;
  let quietWindows = 0;
  for (let index = 0; index < levels.length; index++) {
    if (levels[index] >= maximum * 0.1) {
      // ponytail: energy-rise heuristic; use spectral flux for weak or closely spaced contacts.
      const newStrike =
        start >= 0 &&
        index - start >= 3 &&
        levels[index] > levels[index - 1] * 2.5 &&
        levels[index] - levels[index - 1] > maximum * 0.1;
      if (newStrike) {
        ranges.push({ start, end: index - 1 });
        start = index;
      }
      if (start < 0) start = index;
      end = index;
      quietWindows = 0;
    } else if (start >= 0 && ++quietWindows > 3) {
      ranges.push({ start, end });
      start = -1;
      quietWindows = 0;
    }
  }
  if (start >= 0) ranges.push({ start, end });
  return ranges;
}

export function measureEnvelope(samples: Float32Array, sampleRate: number) {
  const windowSize = Math.max(1, Math.ceil(sampleRate / 200));
  const windowMs = (windowSize * 1000) / sampleRate;
  const levels = rmsWindows(samples, windowSize);
  const maximum = Math.max(...levels);
  if (!maximum) return [];
  const ranges = eventRanges(levels, maximum);
  return ranges.map(({ start: first, end: last }, eventIndex) => {
    let peakIndex = first;
    for (let index = first + 1; index <= last; index++)
      if (levels[index] > levels[peakIndex]) peakIndex = index;
    const peakRms = levels[peakIndex];
    const nextStart = ranges[eventIndex + 1]?.start ?? levels.length;
    let decayEnd = last;
    for (let index = peakIndex; index < nextStart; index++)
      if (levels[index] >= peakRms * 0.02) decayEnd = index;
    const end = Math.min(decayEnd + 1, first + Math.floor(2000 / windowMs));
    const envelope = [levels[first] / peakRms];
    for (let index = first + 1; index < end; index++)
      envelope.push(
        Math.min(1, (levels[index - 1] + levels[index]) / (2 * peakRms)),
      );
    envelope.push(0);
    return {
      delayMs: Math.round(first * windowMs),
      durationMs: Math.round((end - first) * windowMs),
      attackMs: Math.max(3, Math.round((peakIndex - first) * windowMs)),
      peakRms,
      sampleIndex: first * windowSize,
      envelope,
    };
  });
}
