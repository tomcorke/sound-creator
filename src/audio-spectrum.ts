const FFT_SIZE = 2048;

type SpectralPeak = { frequencyHz: number; magnitude: number };

export function analyzeSpectrum(real: Float64Array, sampleRate: number) {
  const magnitudes = fftMagnitudes(real, new Float64Array(FFT_SIZE));
  return {
    peaks: findPeaks(magnitudes, sampleRate),
    flatness: spectralFlatness(magnitudes),
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

function findPeaks(magnitudes: Float64Array, sampleRate: number) {
  const maximum = magnitudes.reduce((peak, value) => Math.max(peak, value), 0);
  const candidates: SpectralPeak[] = [];
  for (let bin = 2; bin < magnitudes.length - 1; bin++) {
    const magnitude = magnitudes[bin];
    const frequencyHz = (bin * sampleRate) / FFT_SIZE;
    if (
      magnitude < maximum * 0.08 ||
      magnitude <= magnitudes[bin - 1] ||
      magnitude <= magnitudes[bin + 1] ||
      frequencyHz < 100 ||
      frequencyHz > 1600
    )
      continue;
    candidates.push({ frequencyHz: Math.round(frequencyHz), magnitude });
  }

  const peaks: SpectralPeak[] = [];
  for (const candidate of candidates.sort(
    (a, b) => b.magnitude - a.magnitude,
  )) {
    if (
      peaks.every(
        (peak) => Math.abs(peak.frequencyHz - candidate.frequencyHz) > 35,
      )
    )
      peaks.push(candidate);
    if (peaks.length === 5) break;
  }
  return peaks;
}

function spectralFlatness(magnitudes: Float64Array) {
  const values = magnitudes.slice(2).filter((value) => value > 0);
  if (!values.length) return 0;
  const arithmetic =
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const geometric = Math.exp(
    values.reduce((sum, value) => sum + Math.log(value), 0) / values.length,
  );
  return arithmetic ? geometric / arithmetic : 0;
}

function spectralCentroid(magnitudes: Float64Array, sampleRate: number) {
  let weighted = 0;
  let total = 0;
  for (let bin = 1; bin < magnitudes.length; bin++) {
    const magnitude = magnitudes[bin];
    weighted += ((bin * sampleRate) / FFT_SIZE) * magnitude;
    total += magnitude;
  }
  return Math.round(
    Math.max(200, Math.min(6000, total ? weighted / total : 900)),
  );
}
