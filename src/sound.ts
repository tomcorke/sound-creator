import { z } from "zod";

const range = (min: number, max: number) =>
  z.number().finite().min(min).max(max);

export const WaveformSchema = z.enum([
  "sine",
  "square",
  "sawtooth",
  "triangle",
]);

export const ToneSettingsSchema = z
  .object({
    enabled: z.boolean(),
    waveform: WaveformSchema,
    startFrequencyHz: range(100, 1600),
    endFrequencyHz: range(50, 1600),
    sweepMs: range(5, 150),
    fadeMs: range(5, 300),
    durationMs: range(15, 300),
    gain: range(0.01, 0.3),
  })
  .strict();

export const ClickSettingsSchema = z
  .object({
    enabled: z.boolean(),
    durationMs: range(3, 60),
    highpassHz: range(200, 6000),
    gain: range(0.01, 0.25),
  })
  .strict();

export const SoundSettingsSchema = z
  .object({
    version: z.literal(1),
    name: z.string().max(48),
    tone: ToneSettingsSchema,
    click: ClickSettingsSchema,
  })
  .strict();

export type Waveform = z.infer<typeof WaveformSchema>;
export type ToneSettings = z.infer<typeof ToneSettingsSchema>;
export type ClickSettings = z.infer<typeof ClickSettingsSchema>;
export type SoundSettings = z.infer<typeof SoundSettingsSchema>;

export const DEFAULT_SOUND: SoundSettings = {
  version: 1,
  name: "Scrabble tile",
  tone: {
    enabled: true,
    waveform: "triangle",
    startFrequencyHz: 780,
    endFrequencyHz: 260,
    sweepMs: 35,
    fadeMs: 45,
    durationMs: 50,
    gain: 0.13,
  },
  click: {
    enabled: true,
    durationMs: 12,
    highpassHz: 900,
    gain: 0.08,
  },
};

export const PRESETS: Record<string, SoundSettings> = {
  "Scrabble tile": DEFAULT_SOUND,
  "Warm wooden tap": {
    version: 1,
    name: "Warm wooden tap",
    tone: {
      enabled: true,
      waveform: "triangle",
      startFrequencyHz: 520,
      endFrequencyHz: 210,
      sweepMs: 52,
      fadeMs: 90,
      durationMs: 100,
      gain: 0.11,
    },
    click: {
      enabled: true,
      durationMs: 18,
      highpassHz: 500,
      gain: 0.05,
    },
  },
  "Bright click": {
    version: 1,
    name: "Bright click",
    tone: {
      enabled: true,
      waveform: "sine",
      startFrequencyHz: 1250,
      endFrequencyHz: 620,
      sweepMs: 16,
      fadeMs: 38,
      durationMs: 42,
      gain: 0.08,
    },
    click: {
      enabled: true,
      durationMs: 8,
      highpassHz: 1800,
      gain: 0.14,
    },
  },
};

let audioContext: AudioContext | undefined;

export function isSoundSettings(value: unknown): value is SoundSettings {
  return SoundSettingsSchema.safeParse(value).success;
}

export function playSound(settings: SoundSettings): boolean {
  if (
    !isSoundSettings(settings) ||
    typeof window === "undefined" ||
    !window.AudioContext
  )
    return false;

  try {
    if (!audioContext || audioContext.state === "closed")
      audioContext = new window.AudioContext();
    if (audioContext.state === "suspended")
      void audioContext.resume().catch(() => {});

    const now = audioContext.currentTime;
    if (settings.tone.enabled) playTone(audioContext, settings.tone, now);
    if (settings.click.enabled) playClick(audioContext, settings.click, now);
    return true;
  } catch {
    return false;
  }
}

function playTone(context: AudioContext, settings: ToneSettings, now: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = settings.waveform;
  oscillator.frequency.setValueAtTime(settings.startFrequencyHz, now);
  oscillator.frequency.exponentialRampToValueAtTime(
    settings.endFrequencyHz,
    now + settings.sweepMs / 1000,
  );
  gain.gain.setValueAtTime(settings.gain, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + settings.fadeMs / 1000);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + settings.durationMs / 1000);
}

function playClick(
  context: AudioContext,
  settings: ClickSettings,
  now: number,
) {
  const length = Math.ceil((context.sampleRate * settings.durationMs) / 1000);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index++)
    samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length);

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = "highpass";
  filter.frequency.setValueAtTime(settings.highpassHz, now);
  gain.gain.setValueAtTime(settings.gain, now);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    now + settings.durationMs / 1000,
  );
  source.connect(filter).connect(gain).connect(context.destination);
  source.start(now);
  source.stop(now + settings.durationMs / 1000);
}
