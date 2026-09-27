import { useReducer } from "react";
import {
  DEFAULT_SOUND,
  MAX_SOUND_LAYERS,
  playSound,
  type SoundLayer,
  type SoundSettings,
} from "../sound.ts";

type LayerPatch = Partial<SoundLayer>;
type EditorState = {
  settings: SoundSettings;
  playStatus: string;
  exportStatus: string;
};
type Action =
  | { type: "rename"; name: string }
  | { type: "update-layer"; id: string; patch: LayerPatch }
  | { type: "add-layer"; layer: SoundLayer }
  | { type: "duplicate-layer"; id: string; newId: string }
  | { type: "remove-layer"; id: string }
  | { type: "move-layer"; id: string; direction: -1 | 1 }
  | { type: "apply-layers"; layers: SoundLayer[] }
  | { type: "load"; settings: SoundSettings }
  | { type: "reset" }
  | { type: "play-status"; status: string }
  | { type: "export-status"; status: string };

function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "rename":
      return {
        ...state,
        settings: { ...state.settings, name: action.name },
        exportStatus: "",
      };
    case "update-layer":
      return {
        ...state,
        settings: {
          ...state.settings,
          layers: state.settings.layers.map((layer) =>
            layer.id === action.id
              ? ({ ...layer, ...action.patch } as SoundLayer)
              : layer,
          ),
        },
        exportStatus: "",
      };
    case "add-layer":
      if (state.settings.layers.length >= MAX_SOUND_LAYERS) return state;
      return {
        ...state,
        settings: {
          ...state.settings,
          layers: [...state.settings.layers, action.layer],
        },
        exportStatus: "",
      };
    case "duplicate-layer": {
      if (state.settings.layers.length >= MAX_SOUND_LAYERS) return state;
      const index = state.settings.layers.findIndex(
        (layer) => layer.id === action.id,
      );
      if (index < 0) return state;
      const layers = [...state.settings.layers];
      layers.splice(index + 1, 0, { ...layers[index], id: action.newId });
      return {
        ...state,
        settings: { ...state.settings, layers },
        exportStatus: "",
      };
    }
    case "remove-layer":
      return {
        ...state,
        settings: {
          ...state.settings,
          layers: state.settings.layers.filter(
            (layer) => layer.id !== action.id,
          ),
        },
        exportStatus: "",
      };
    case "move-layer": {
      const from = state.settings.layers.findIndex(
        (layer) => layer.id === action.id,
      );
      const to = from + action.direction;
      if (from < 0 || to < 0 || to >= state.settings.layers.length)
        return state;
      const layers = [...state.settings.layers];
      const [layer] = layers.splice(from, 1);
      layers.splice(to, 0, layer);
      return {
        ...state,
        settings: { ...state.settings, layers },
        exportStatus: "",
      };
    }
    case "apply-layers":
      return {
        ...state,
        settings: { ...state.settings, layers: structuredClone(action.layers) },
        playStatus: "Analysis layers applied. Compare them with the reference.",
        exportStatus: "",
      };
    case "load":
      return {
        settings: structuredClone(action.settings),
        playStatus: `Loaded “${action.settings.name || "Untitled sound"}”.`,
        exportStatus: "",
      };
    case "reset":
      return {
        settings: structuredClone(DEFAULT_SOUND),
        playStatus: "Restored the Scrabble tile settings.",
        exportStatus: "",
      };
    case "play-status":
      return { ...state, playStatus: action.status };
    case "export-status":
      return { ...state, exportStatus: action.status };
  }
}

function createLayer(type: SoundLayer["type"]): SoundLayer {
  const id = crypto.randomUUID();
  return type === "oscillator"
    ? {
        id,
        type,
        delayMs: 0,
        enabled: true,
        waveform: "sine",
        startFrequencyHz: 440,
        endFrequencyHz: 330,
        sweepMs: 60,
        fadeMs: 180,
        durationMs: 200,
        gain: 0.08,
      }
    : {
        id,
        type,
        delayMs: 0,
        enabled: true,
        filterType: "highpass",
        filterFrequencyHz: 1200,
        fadeMs: 40,
        durationMs: 60,
        gain: 0.06,
      };
}

export function useSoundEditor() {
  const [state, dispatch] = useReducer(editorReducer, {
    settings: DEFAULT_SOUND,
    playStatus: "",
    exportStatus: "",
  });

  function preview() {
    const status = !state.settings.layers.some((layer) => layer.enabled)
      ? "Enable a layer to preview this sound."
      : playSound(state.settings)
        ? "Playing current settings."
        : "Web Audio is not available in this browser.";
    dispatch({ type: "play-status", status });
  }

  return {
    ...state,
    updateName: (name: string) => dispatch({ type: "rename", name }),
    updateLayer: (id: string, patch: LayerPatch) =>
      dispatch({ type: "update-layer", id, patch }),
    addLayer: (type: SoundLayer["type"]) =>
      dispatch({ type: "add-layer", layer: createLayer(type) }),
    duplicateLayer: (id: string) =>
      dispatch({ type: "duplicate-layer", id, newId: crypto.randomUUID() }),
    removeLayer: (id: string) => dispatch({ type: "remove-layer", id }),
    moveLayer: (id: string, direction: -1 | 1) =>
      dispatch({ type: "move-layer", id, direction }),
    applyLayers: (layers: SoundLayer[]) =>
      dispatch({ type: "apply-layers", layers }),
    load: (settings: SoundSettings) => dispatch({ type: "load", settings }),
    reset: () => dispatch({ type: "reset" }),
    preview,
    setExportStatus: (status: string) =>
      dispatch({ type: "export-status", status }),
  };
}
