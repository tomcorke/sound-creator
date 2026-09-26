import settings from "./scrabble-tile.json";
import { isSoundSettings, playSound } from "../../src/sound.ts";

const button = document.querySelector("#play");
const status = document.querySelector("#status");

button.addEventListener("click", () => {
  status.textContent = isSoundSettings(settings)
    ? playSound(settings)
      ? "Playing."
      : "Web Audio is unavailable."
    : "Invalid sound settings.";
});
