import { MAX_FREQUENCY_HZ } from "./sound.ts";

export const FFT_SIZE = 2048;

type SpectralPeak = {
  frequencyHz: number;
  magnitude: number;
  powerFraction: number;
  prominence: number;
};

type Spectrum = ReturnType<typeof analyzeSpectrum>;

export function analyzeSpectrum(real: Float64Array, sampleRate: number) {
  const magnitudes = fftMagnitudes(real, new Float64Array(FFT_SIZE));
  const power = magnitudes.map((value) => value ** 2);
  return {
    peaks: findPeaks(magnitudes, power, sampleRate),
    power,
    centroidHz: spectralCentroid(magnitudes, sampleRate),
  };
}

function fftMagnitudes(real: Float64Array, imaginary: Float64Array) {
  for (let index = 1, reversed = 0; index < FFT_SIZE; index++) {
    let bit = FFT_SIZE >> 1;
    for (; reversed & bit; bit >>= 1) reversed ^= bit;
    reversed ^= bit;
    if (index < reversed) {
      [real[index], real[reversed]] = [real[reversed], real[index]];
      [imaginary[index], imaginary[reversed]] = [
        imaginary[reversed],
        imaginary[index],
      ];
    }
  }

  for (let size = 2; size <= FFT_SIZE; size *= 2) {
    const half = size / 2;
    for (let offset = 0; offset < FFT_SIZE; offset += size) {
      for (let index = 0; index < half; index++) {
        const angle = (-2 * Math.PI * index) / size;
        const even = offset + index;
        const odd = even + half;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const realPart = cosine * real[odd] - sine * imaginary[odd];
        const imaginaryPart = sine * real[odd] + cosine * imaginary[odd];
        real[odd] = real[even] - realPart;
        imaginary[odd] = imaginary[even] - imaginaryPart;
        real[even] += realPart;
        imaginary[even] += imaginaryPart;
      }
    }
  }

  return Float64Array.from(real.slice(0, FFT_SIZE / 2), (value, index) =>
    Math.hypot(value, imaginary[index]),
  );
}

function findPeaks(
  magnitudes: Float64Array,
  power: Float64Array,
  sampleRate: number,
) {
  const maximum = Math.max(...magnitudes);
  const totalPower = power.reduce((sum, value) => sum + value, 0);
  const candidates: SpectralPeak[] = [];
  for (let bin = 2; bin < magnitudes.length - 8; bin++) {
    const magnitude = magnitudes[bin];
    const frequencyHz = (bin * sampleRate) / FFT_SIZE;
    if (
      magnitude < maximum * 0.08 ||
      magnitude <= magnitudes[bin - 1] ||
      magnitude <= magnitudes[bin + 1] ||
      frequencyHz < 100 ||
      frequencyHz > MAX_FREQUENCY_HZ
    )
      continue;
    let background = 0;
    for (let offset = 3; offset <= 8; offset++)
      background +=
        (power[bin - Math.min(offset, bin)] + power[bin + offset]) / 12;
    const localPower = power[bin - 1] + power[bin] + power[bin + 1];
    const offset =
      (0.5 * (magnitudes[bin - 1] - magnitudes[bin + 1])) /
      (magnitudes[bin - 1] - 2 * magnitude + magnitudes[bin + 1]);
    candidates.push({
      frequencyHz: Math.max(
        100,
        Math.min(
          MAX_FREQUENCY_HZ,
          Math.round(((bin + offset) * sampleRate) / FFT_SIZE),
        ),
      ),
      magnitude,
      powerFraction: totalPower
        ? Math.max(0, localPower - 3 * background) / totalPower
        : 0,
      prominence: magnitude / Math.max(1e-12, Math.sqrt(background)),
    });
  }
  return candidates.sort((a, b) => b.magnitude - a.magnitude).slice(0, 5);
}

function spectralCentroid(magnitudes: Float64Array, sampleRate: number) {
  let weighted = 0;
  let total = 0;
  for (let bin = 1; bin < magnitudes.length; bin++) {
    weighted += ((bin * sampleRate) / FFT_SIZE) * magnitudes[bin];
    total += magnitudes[bin];
  }
  return Math.round(
    Math.max(200, Math.min(MAX_FREQUENCY_HZ, total ? weighted / total : 900)),
  );
}

export function persistentPeaks(spectra: Spectrum[]) {
  const candidates: (SpectralPeak & { hits: number; lastSeen: number })[] = [];
  for (let frame = 0; frame < spectra.length; frame++) {
    for (const peak of spectra[frame].peaks) {
      const candidate = candidates.find(
        (item) => Math.abs(item.frequencyHz - peak.frequencyHz) <= 50,
      );
      if (!candidate) candidates.push({ ...peak, hits: 1, lastSeen: frame });
      else if (candidate.lastSeen !== frame) {
        candidate.frequencyHz = Math.round(
          (candidate.frequencyHz * candidate.hits + peak.frequencyHz) /
            (candidate.hits + 1),
        );
        candidate.magnitude += peak.magnitude;
        candidate.powerFraction += peak.powerFraction;
        candidate.prominence += peak.prominence;
        candidate.hits++;
        candidate.lastSeen = frame;
      }
    }
  }
  return candidates
    .filter((candidate) => candidate.hits >= Math.ceil(spectra.length / 2))
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, 5)
    .map((candidate) => ({
      ...candidate,
      powerFraction: candidate.powerFraction / candidate.hits,
      prominence: candidate.prominence / candidate.hits,
    }));
}

export function residualSpectrum(
  spectra: Spectrum[],
  peaks: SpectralPeak[],
  sampleRate: number,
) {
  const power = new Float64Array(FFT_SIZE / 2);
  for (const spectrum of spectra)
    for (let bin = 0; bin < power.length; bin++)
      power[bin] += spectrum.power[bin];
  const total = power.reduce((sum, value) => sum + value, 0);
  for (const peak of peaks) {
    const center = Math.round((peak.frequencyHz * FFT_SIZE) / sampleRate);
    const background =
      ((power[center - 4] ?? 0) + (power[center + 4] ?? 0)) / 2;
    for (
      let bin = Math.max(1, center - 3);
      bin <= Math.min(power.length - 1, center + 3);
      bin++
    )
      power[bin] = Math.min(power[bin], background);
  }
  return {
    power,
    fraction: total ? power.reduce((sum, value) => sum + value, 0) / total : 0,
  };
}
