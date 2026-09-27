import type { SoundLayer } from "./sound.ts";
import { MAX_SOUND_LAYERS } from "./sound.ts";
import { analyzeSpectrum } from "./audio-spectrum.ts";

const FFT_SIZE = 2048;
const MAX_TONAL_FLATNESS = 0.06;
const MIN_SLIDE_SPECTRAL_DRIFT_HZ = 300;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_DURATION_SECONDS = 30;
const ANALYSIS_SECONDS = 3;
const MAX_SUGGESTED_EVENTS = Math.floor(MAX_SOUND_LAYERS / 6);

type AudioBufferData = Pick<
  AudioBuffer,
  "duration" | "length" | "numberOfChannels" | "sampleRate" | "getChannelData"
>;

type DetectedEvent = {
  delayMs: number;
  durationMs: number;
  attackMs: number;
  peakRms: number;
  sampleIndex: number;
};

export type AudioAnalysis = {
  durationMs: number;
  events: Pick<DetectedEvent, "delayMs" | "durationMs" | "attackMs">[];
  peakFrequenciesHz: number[];
  layers: SoundLayer[];
};

export async function analyzeAudioFile(file: File): Promise<AudioAnalysis> {
  if (!file.size) throw new Error("Choose a non-empty audio file.");
  if (file.size > MAX_FILE_BYTES)
    throw new Error("Audio files must be 25 MB or smaller.");

  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    return analyzeAudioBuffer(buffer);
  } finally {
    await context.close().catch(() => {});
  }
}

export function analyzeAudioBuffer(buffer: AudioBufferData): AudioAnalysis {
  if (!buffer.length || !buffer.numberOfChannels || !buffer.sampleRate)
    throw new Error("This audio file has no sample data.");
  if (
    !Number.isFinite(buffer.duration) ||
    buffer.duration > MAX_DURATION_SECONDS
  )
    throw new Error("Audio files must be 30 seconds or shorter.");

  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) =>
    buffer.getChannelData(index),
  );
  const samples = new Float32Array(
    Math.min(buffer.length, Math.ceil(buffer.sampleRate * ANALYSIS_SECONDS)),
  );
  for (let index = 0; index < samples.length; index++) {
    for (const channel of channels)
      samples[index] += channel[index] / channels.length;
  }

  const events = measureEnvelope(samples, buffer.sampleRate).slice(
    0,
    MAX_SUGGESTED_EVENTS,
  );
  if (!events.length)
    throw new Error("No sound was detected in this recording.");

  const suggestions = events.map((event, index) =>
    suggestEventLayers(
      samples,
      event,
      events[index + 1],
      buffer.sampleRate,
      index,
    ),
  );
  return {
    durationMs: Math.round(buffer.duration * 1000),
    events: events.map(({ delayMs, durationMs, attackMs }) => ({
      delayMs,
      durationMs,
      attackMs,
    })),
    peakFrequenciesHz: suggestions.flatMap((suggestion) => suggestion.peaks),
    layers: suggestions.flatMap((suggestion) => suggestion.layers),
  };
}

function measureEnvelope(samples: Float32Array, sampleRate: number) {
  const windowSize = Math.max(1, Math.round(sampleRate / 200));
  const windowMs = (windowSize * 1000) / sampleRate;
  const levels: number[] = [];
  let maximum = 0;
  for (let start = 0; start < samples.length; start += windowSize) {
    const length = Math.min(windowSize, samples.length - start);
    let energy = 0;
    for (let index = 0; index < length; index++)
      energy += samples[start + index] ** 2;
    const level = Math.sqrt(energy / length);
    levels.push(level);
    maximum = Math.max(maximum, level);
  }
  if (!maximum) return [];

  const threshold = maximum * 0.1;
  const ranges: { start: number; end: number }[] = [];
  let start = -1;
  let end = -1;
  let quietWindows = 0;
  for (let index = 0; index < levels.length; index++) {
    if (levels[index] >= threshold) {
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

  return ranges.map(({ start: first, end: last }, eventIndex) => {
    let peakIndex = first;
    for (let index = first + 1; index <= last; index++)
      if (levels[index] > levels[peakIndex]) peakIndex = index;
    const tailThreshold = levels[peakIndex] * 0.04;
    const nextStart = ranges[eventIndex + 1]?.start ?? levels.length;
    let decayEnd = peakIndex;
    for (let index = peakIndex; index < nextStart; index++)
      if (levels[index] >= tailThreshold) decayEnd = index;
    return {
      delayMs: Math.round(first * windowMs),
      durationMs: Math.round((Math.max(last, decayEnd) - first + 1) * windowMs),
      attackMs: Math.max(3, Math.round((peakIndex - first) * windowMs)),
      peakRms: levels[peakIndex],
      sampleIndex: first * windowSize,
    };
  });
}

function persistentPeaks(spectra: ReturnType<typeof analyzeSpectrum>[]) {
  const candidates: {
    frequencyHz: number;
    magnitude: number;
    hits: number;
    lastSeen: number;
  }[] = [];
  for (let frame = 0; frame < spectra.length; frame++) {
    for (const peak of spectra[frame].peaks) {
      const candidate = candidates.find(
        (item) => Math.abs(item.frequencyHz - peak.frequencyHz) <= 50,
      );
      if (!candidate) {
        candidates.push({ ...peak, hits: 1, lastSeen: frame });
      } else if (candidate.lastSeen !== frame) {
        candidate.frequencyHz = Math.round(
          (candidate.frequencyHz * candidate.hits + peak.frequencyHz) /
            (candidate.hits + 1),
        );
        candidate.magnitude += peak.magnitude;
        candidate.hits++;
        candidate.lastSeen = frame;
      }
    }
  }

  const minimumHits = Math.ceil(spectra.length / 2);
  return candidates
    .filter((candidate) => candidate.hits >= minimumHits)
    .sort((left, right) => right.magnitude - left.magnitude)
    .slice(0, 5);
}

function eventSpectra(
  samples: Float32Array,
  event: DetectedEvent,
  nextEvent: DetectedEvent | undefined,
  durationMs: number,
  sampleRate: number,
) {
  const start = event.sampleIndex;
  const end = Math.min(
    samples.length,
    nextEvent?.sampleIndex ?? samples.length,
    start + Math.round((durationMs * sampleRate) / 1000),
  );
  const lastStart = Math.max(start, end - FFT_SIZE);
  const frameCount = Math.min(
    5,
    Math.ceil((lastStart - start) / (sampleRate * 0.04)) + 1,
  );
  const spectra = [];
  for (let frame = 0; frame < frameCount; frame++) {
    const frameStart =
      frameCount === 1
        ? start
        : Math.round(start + ((lastStart - start) * frame) / (frameCount - 1));
    const window = new Float64Array(FFT_SIZE);
    for (let index = 0; index < Math.min(FFT_SIZE, end - frameStart); index++)
      window[index] =
        samples[frameStart + index] *
        (0.5 - 0.5 * Math.cos((2 * Math.PI * index) / FFT_SIZE));
    spectra.push(analyzeSpectrum(window, sampleRate));
  }
  return spectra;
}

function suggestEventLayers(
  samples: Float32Array,
  event: DetectedEvent,
  nextEvent: DetectedEvent | undefined,
  sampleRate: number,
  eventIndex: number,
) {
  const durationMs = Math.max(15, Math.min(2000, event.durationMs));
  const spectra = eventSpectra(
    samples,
    event,
    nextEvent,
    durationMs,
    sampleRate,
  );
  const flatness =
    spectra.reduce((sum, spectrum) => sum + spectrum.flatness, 0) /
    spectra.length;
  const resonances = persistentPeaks(spectra);
  const peaks = flatness < MAX_TONAL_FLATNESS ? resonances : [];
  const centroidHz = Math.round(
    spectra.reduce((sum, spectrum) => sum + spectrum.centroidHz, 0) /
      spectra.length,
  );
  const resonanceFrequencies: number[] = [];
  for (const resonance of resonances)
    resonanceFrequencies.push(resonance.frequencyHz);
  resonanceFrequencies.sort((left, right) => left - right);
  const resonanceHz =
    resonanceFrequencies[Math.floor(resonanceFrequencies.length / 2)] ??
    centroidHz;
  const firstCentroidHz = spectra[0].centroidHz;
  const lastCentroidHz = spectra[spectra.length - 1].centroidHz;
  const isSlide =
    durationMs >= 100 &&
    event.attackMs >= 20 &&
    Math.abs(lastCentroidHz - firstCentroidHz) >= MIN_SLIDE_SPECTRAL_DRIFT_HZ;
  const attackMs = isSlide
    ? Math.min(event.attackMs, durationMs - 3)
    : undefined;
  const fadeMs = attackMs ? durationMs - attackMs : durationMs;
  const layers: SoundLayer[] = [];
  for (let index = 0; index < peaks.length; index++) {
    const peak = peaks[index];
    layers.push({
      id: `analysis-${eventIndex + 1}-tone-${index + 1}`,
      type: "oscillator",
      delayMs: event.delayMs,
      enabled: true,
      waveform: "sine",
      startFrequencyHz: peak.frequencyHz,
      endFrequencyHz: peak.frequencyHz,
      sweepMs: 35,
      fadeMs: durationMs,
      durationMs,
      gain: Math.max(
        0.02,
        Math.min(0.2, (0.12 * peak.magnitude) / peaks[0].magnitude),
      ),
    });
  }

  if (!peaks.length) {
    layers.push({
      id: `analysis-${eventIndex + 1}-noise`,
      type: "noise",
      delayMs: event.delayMs,
      enabled: true,
      filterType: isSlide ? "lowpass" : "bandpass",
      filterFrequencyHz: isSlide
        ? firstCentroidHz
        : Math.max(200, Math.min(6000, resonanceHz)),
      filterEndFrequencyHz: isSlide ? lastCentroidHz : undefined,
      attackMs,
      durationMs,
      fadeMs,
      gain: Math.max(0.05, Math.min(0.3, event.peakRms * 4)),
    });
  }

  const frequencies: number[] = [];
  for (const peak of peaks) frequencies.push(peak.frequencyHz);
  return { layers, peaks: frequencies };
}
