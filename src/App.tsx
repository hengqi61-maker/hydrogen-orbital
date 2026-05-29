import { useCallback, useEffect, useRef, useState } from "react";
import { HydrogenEngine } from "./physics/HydrogenEngine";
import type {
  OrbitalData,
  OrbitalSettings,
  QuantumState,
} from "./physics/HydrogenTypes";
import { ControlPanel } from "./ui/ControlPanel";
import { InfoPanel } from "./ui/InfoPanel";
import { HydrogenOrbitalVisualizer } from "./visualization/HydrogenOrbitalVisualizer";
import "./style.css";

const defaultState: QuantumState = {
  n: 2,
  l: 1,
  m: 0,
};

const defaultSettings: OrbitalSettings = {
  samples: 40000,
  pointSize: 0.055,
  opacity: 0.65,
  colorMode: "density",
  showAxes: true,
  showNucleus: true,
  autoRotate: true,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const visualizerRef = useRef<HydrogenOrbitalVisualizer | null>(null);

  const [inputState, setInputState] = useState<QuantumState>(defaultState);
  const [settings, setSettings] = useState<OrbitalSettings>(defaultSettings);
  const [displayedData, setDisplayedData] = useState<OrbitalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  useEffect(() => {
    if (!mountRef.current || visualizerRef.current) return;

    const visualizer = new HydrogenOrbitalVisualizer(
      mountRef.current,
      defaultSettings,
    );
    const data = HydrogenEngine.generate(defaultState, defaultSettings.samples);

    visualizerRef.current = visualizer;
    setDisplayedData(data);
    visualizer.renderOrbital(data);

    return () => {
      visualizer.dispose();
      visualizerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const result = HydrogenEngine.validateState(inputState);
    setError(result.valid ? null : result.message ?? "量子数非法。");
  }, [inputState]);

  useEffect(() => {
    visualizerRef.current?.applySettings(settings);
  }, [settings]);

  const generateOrbital = useCallback(() => {
    const validation = HydrogenEngine.validateState(inputState);

    if (!validation.valid) {
      setError(validation.message ?? "量子数非法。");
      return;
    }

    const data = HydrogenEngine.generate(inputState, settings.samples);

    setDisplayedData(data);
    setError(null);
    visualizerRef.current?.renderOrbital(data);
  }, [inputState, settings.samples]);

  return (
    <div className="app">
      <InfoPanel
        collapsed={infoCollapsed}
        onToggle={() => setInfoCollapsed((value) => !value)}
        inputState={inputState}
        displayedData={displayedData}
        error={error}
      />

      <main ref={mountRef} className="viewport" />

      <button
        className="toggle-controls"
        type="button"
        onClick={() => setControlsVisible((value) => !value)}
      >
        {controlsVisible ? "Hide Controls" : "Show Controls"}
      </button>

      <ControlPanel
        visible={controlsVisible}
        inputState={inputState}
        settings={settings}
        onInputChange={setInputState}
        onSettingsChange={setSettings}
        onGenerate={generateOrbital}
      />
    </div>
  );
}
