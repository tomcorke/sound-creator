import { useState } from "react";
import { isSoundSettings, playSound } from "../../src/sound.ts";

type SoundButtonProps = { settings: unknown };

export function SoundButton({ settings }: SoundButtonProps) {
  const [status, setStatus] = useState("");

  function play() {
    setStatus(
      isSoundSettings(settings) && playSound(settings)
        ? "Playing."
        : "Sound settings are invalid or Web Audio is unavailable.",
    );
  }

  return (
    <>
      <button type="button" onClick={play}>
        Play sound
      </button>
      <span role="status">{status}</span>
    </>
  );
}
