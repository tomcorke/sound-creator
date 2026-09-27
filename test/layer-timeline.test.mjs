import assert from "node:assert/strict";
import test from "node:test";
import { createLayerTimeline } from "../src/features/layer-timeline.ts";

test("uses the actual end of a short sound", () => {
  const timeline = createLayerTimeline([
    { id: "click", delayMs: 0, durationMs: 15 },
  ]);

  assert.equal(timeline.endMs, 15);
  assert.equal(timeline.layers[0].durationFraction, 1);
});

test("scales to the full sound while showing only 24 layers", () => {
  const layers = Array.from({ length: 25 }, (_, index) => ({
    id: `layer-${index}`,
    delayMs: index === 24 ? 1000 : 0,
    durationMs: 20,
  }));
  const timeline = createLayerTimeline(layers);

  assert.equal(timeline.endMs, 1020);
  assert.equal(timeline.layers.length, 24);
});

test("plots layer starts and durations on shared timeline", () => {
  const timeline = createLayerTimeline([
    { id: "attack", delayMs: 0, durationMs: 15 },
    { id: "body", delayMs: 0, durationMs: 135 },
    { id: "second-hit", delayMs: 185, durationMs: 75 },
  ]);

  assert.equal(timeline.endMs, 260);
  assert.deepEqual(
    timeline.layers.map(({ startFraction, durationFraction }) => [
      startFraction,
      durationFraction,
    ]),
    [
      [0, 15 / 260],
      [0, 135 / 260],
      [185 / 260, 75 / 260],
    ],
  );
});
