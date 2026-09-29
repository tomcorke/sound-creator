import { FFT_SIZE } from "./audio-spectrum.ts";

type NoiseBand = { filterType: "bandpass" | "highpass"; frequencyHz: number };

// Match Web Audio's default filters and white noise's variance (1/3).
function filterPower(band: NoiseBand, bin: number, sampleRate: number) {
  const center =
    (2 * Math.PI * Math.min(band.frequencyHz, sampleRate * 0.49)) / sampleRate;
  const q = band.filterType === "bandpass" ? 1 : 10 ** (1 / 20);
  const alpha = Math.sin(center) / (2 * q);
  const cosine = Math.cos(center);
  const frequency = (2 * Math.PI * bin) / FFT_SIZE;
  const real = Math.cos(frequency);
  const imaginary = -Math.sin(frequency);
  const real2 = Math.cos(2 * frequency);
  const imaginary2 = -Math.sin(2 * frequency);
  const b0 = band.filterType === "bandpass" ? alpha : (1 + cosine) / 2;
  const b1 = band.filterType === "bandpass" ? 0 : -(1 + cosine);
  const b2 = band.filterType === "bandpass" ? -alpha : b0;
  const numerator =
    (b0 + b1 * real + b2 * real2) ** 2 +
    (b1 * imaginary + b2 * imaginary2) ** 2;
  const denominator =
    (1 + alpha - 2 * cosine * real + (1 - alpha) * real2) ** 2 +
    (-2 * cosine * imaginary + (1 - alpha) * imaginary2) ** 2;
  return numerator / Math.max(1e-12, denominator) / (FFT_SIZE / 2) / 3;
}

function octavePowers(power: Float64Array, sampleRate: number) {
  const result = new Float64Array(
    Math.max(1, Math.ceil(Math.log2(sampleRate / 500)) + 1),
  );
  for (let bin = 1; bin < power.length; bin++) {
    const frequencyHz = (bin * sampleRate) / FFT_SIZE;
    const band = Math.max(
      0,
      Math.min(result.length - 1, Math.floor(Math.log2(frequencyHz / 250)) + 1),
    );
    result[band] += power[bin];
  }
  return result;
}

function nonnegativeFit(target: Float64Array, responses: Float64Array[]) {
  const coefficients = new Float64Array(responses.length);
  const residual = target.slice();
  const weights = target.map((value) => 1 / Math.max(0.005, value) ** 2);
  // ponytail: octave-band coordinate descent; use a finer spectrum if narrow noise coloration matters.
  for (let iteration = 0; iteration < 80; iteration++) {
    responses.forEach((response, index) => {
      let numerator = 0;
      let denominator = 0;
      for (let band = 0; band < target.length; band++) {
        numerator += response[band] * residual[band] * weights[band];
        denominator += response[band] ** 2 * weights[band];
      }
      const next = Math.max(
        0,
        coefficients[index] + numerator / Math.max(1e-12, denominator),
      );
      const change = next - coefficients[index];
      coefficients[index] = next;
      for (let band = 0; band < target.length; band++)
        residual[band] -= response[band] * change;
    });
  }
  return coefficients;
}

export function fitNoiseSpectrum(
  power: Float64Array,
  sampleRate: number,
  resonanceHz: number[],
  limit: number,
) {
  const total = power.reduce((sum, value) => sum + value, 0);
  if (!total || limit < 1) return [];
  const target = octavePowers(
    power.map((value) => value / total),
    sampleRate,
  );
  const frequencies = [
    ...new Set([250, 500, 1000, 2000, 4000, 8000, 16000, ...resonanceHz]),
  ].filter((frequency) => frequency >= 200 && frequency < sampleRate * 0.49);
  const bands: NoiseBand[] = frequencies.map((frequencyHz) => ({
    filterType: "bandpass",
    frequencyHz,
  }));
  bands.push({
    filterType: "highpass",
    frequencyHz: Math.max(200, Math.min(6000, sampleRate * 0.4)),
  });
  const responses = bands.map((band) =>
    octavePowers(
      Float64Array.from({ length: FFT_SIZE / 2 }, (_, bin) =>
        filterPower(band, bin, sampleRate),
      ),
      sampleRate,
    ),
  );
  const coefficients = nonnegativeFit(target, responses);
  const selected = bands
    .map((band, index) => ({
      band,
      response: responses[index],
      energy: coefficients[index] * responses[index].reduce((a, b) => a + b, 0),
    }))
    .filter((item) => item.energy > 0.003)
    .sort((a, b) => b.energy - a.energy)
    .slice(0, limit);
  const fitted = nonnegativeFit(
    target,
    selected.map((item) => item.response),
  );
  const fittedPower = fitted.reduce(
    (sum, value, index) =>
      sum + value * selected[index].response.reduce((a, b) => a + b, 0),
    0,
  );
  return selected.map((item, index) => ({
    ...item.band,
    gainScale: Math.sqrt(fitted[index] / Math.max(1e-12, fittedPower)),
  }));
}
