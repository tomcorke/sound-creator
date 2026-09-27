import type { SoundLayer } from "../sound.ts";

const MAX_VISIBLE_LAYERS = 24;

export function createLayerTimeline(layers: readonly SoundLayer[]) {
  const endMs = layers.length
    ? Math.max(...layers.map((layer) => layer.delayMs + layer.durationMs))
    : 100;

  return {
    endMs,
    layers: layers.slice(0, MAX_VISIBLE_LAYERS).map((layer) => ({
      layer,
      startFraction: layer.delayMs / endMs,
      durationFraction: layer.durationMs / endMs,
    })),
  };
}
