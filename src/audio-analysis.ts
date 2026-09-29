import type { SoundLayer } from "./sound.ts";
import {
  MAX_SOUND_LAYERS,
  MAX_FREQUENCY_HZ,
  SOUND_SAMPLE_RATE,
} from "./sound.ts";
import {
  analyzeSpectrum,
  FFT_SIZE,
  persistentPeaks,
  residualSpectrum,
} from "./audio-spectrum.ts";
import { measureEnvelope, type DetectedEvent } from "./audio-envelope.ts";
import { fitNoiseSpectrum } from "./noise-fitting.ts";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_DURATION_SECONDS = 30;
const ANALYSIS_SECONDS = 3;
const MAX_SUGGESTED_EVENTS = Math.floor(MAX_SOUND_LAYERS / 6);

type AudioBufferData = Pick<
  AudioBuffer,
  "duration" | "length" | "numberOfChannels" | "sampleRate" | "getChannelData"
>;

type Spectrum = ReturnType<typeof analyzeSpectrum>;

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

  const context = new AudioContext({ sampleRate: SOUND_SAMPLE_RATE });
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

function eventSpectra(
  samples: Float32Array,
  event: DetectedEvent,
  nextEvent: DetectedEvent | undefined,
  sampleRate: number,
) {
  const start = event.sampleIndex;
  const end = Math.min(
    samples.length,
    nextEvent?.sampleIndex ?? samples.length,
    start + Math.round((event.durationMs * sampleRate) / 1000),
  );
  const count = Math.min(5, Math.ceil(event.durationMs / 40) + 1);
  return Array.from({ length: count }, (_, frame) => {
    // Center the Hann window on each frame; a window starting at the onset suppresses the impact.
    const frameStart = Math.round(
      start + ((end - start) * frame) / count - FFT_SIZE / 2,
    );
    const window = new Float64Array(FFT_SIZE);
    for (let index = 0; index < FFT_SIZE; index++) {
      const sample = frameStart + index;
      if (sample >= start && sample < end)
        window[index] =
          samples[sample] *
          (0.5 - 0.5 * Math.cos((2 * Math.PI * index) / FFT_SIZE));
    }
    return analyzeSpectrum(window, sampleRate);
  });
}

function suggestEventLayers(
  samples: Float32Array,
  event: DetectedEvent,
  nextEvent: DetectedEvent | undefined,
  sampleRate: number,
  eventIndex: number,
) {
  const spectra = eventSpectra(samples, event, nextEvent, sampleRate);
  const resonances = persistentPeaks(spectra);
  const peaks = resonances.filter(
    (peak) => peak.prominence >= 5 && peak.powerFraction >= 0.025,
  );
  const residual = residualSpectrum(spectra, peaks, sampleRate);
  const common = {
    delayMs: event.delayMs,
    enabled: true,
    durationMs: Math.max(15, event.durationMs),
    fadeMs: Math.max(5, event.durationMs),
    envelope: event.envelope,
  };
  const tonalPower = peaks.reduce((sum, peak) => sum + peak.powerFraction, 0);
  const layers: SoundLayer[] = peaks.map((peak, index) => ({
    ...common,
    id: `analysis-${eventIndex + 1}-tone-${index + 1}`,
    type: "oscillator",
    waveform: "sine",
    startFrequencyHz: peak.frequencyHz,
    endFrequencyHz: peak.frequencyHz,
    sweepMs: 35,
    gain: Math.max(
      0.00001,
      Math.min(
        0.3,
        event.peakRms *
          Math.sqrt(
            (2 * (1 - residual.fraction) * peak.powerFraction) / tonalPower,
          ),
      ),
    ),
  }));
  if (residual.fraction > 0.02) {
    const noise = suggestNoiseLayers(
      spectra,
      residual,
      resonances,
      event,
      sampleRate,
      6 - layers.length,
    );
    noise.forEach((band, index) =>
      layers.push({
        ...common,
        ...band,
        id: `analysis-${eventIndex + 1}-noise-${index + 1}`,
        type: "noise",
        durationMs: Math.max(3, event.durationMs),
        fadeMs: Math.max(3, event.durationMs),
      }),
    );
  }
  return { layers, peaks: peaks.map((peak) => peak.frequencyHz) };
}

function suggestNoiseLayers(
  spectra: Spectrum[],
  residual: ReturnType<typeof residualSpectrum>,
  resonances: Spectrum["peaks"],
  event: DetectedEvent,
  sampleRate: number,
  limit: number,
) {
  const first = spectra[0].centroidHz;
  const last = spectra[spectra.length - 1].centroidHz;
  const isSlide =
    event.durationMs >= 100 &&
    event.attackMs >= 20 &&
    Math.abs(last - first) >= 300;
  if (isSlide)
    return [
      {
        filterType: "lowpass" as const,
        filterFrequencyHz: Math.min(MAX_FREQUENCY_HZ, first),
        filterEndFrequencyHz: Math.min(MAX_FREQUENCY_HZ, last),
        attackMs: event.attackMs,
        gain: Math.max(
          0.00001,
          Math.min(
            0.3,
            event.peakRms * Math.sqrt((3 * sampleRate) / (2 * first)),
          ),
        ),
      },
    ];
  return fitNoiseSpectrum(
    residual.power,
    sampleRate,
    resonances.map((peak) => peak.frequencyHz),
    limit,
  )
    .filter((band) => band.gainScale > 0)
    .map((band) => ({
      filterType: band.filterType,
      filterFrequencyHz: band.frequencyHz,
      gain: Math.max(
        0.00001,
        Math.min(
          0.3,
          event.peakRms * Math.sqrt(residual.fraction) * band.gainScale,
        ),
      ),
    }));
}
