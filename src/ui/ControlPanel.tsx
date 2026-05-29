import { useEffect, useRef } from "react";
import GUI from "lil-gui";
import type { OrbitalSettings, QuantumState } from "../physics/HydrogenTypes";

interface Props {
  visible: boolean;
  inputState: QuantumState;
  settings: OrbitalSettings;
  onInputChange: (state: QuantumState) => void;
  onSettingsChange: (settings: OrbitalSettings) => void;
  onGenerate: () => void;
}

export function ControlPanel({
  visible,
  inputState,
  settings,
  onInputChange,
  onSettingsChange,
  onGenerate,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!visible || !ref.current) return;

    ref.current.innerHTML = "";

    const params = {
      ...inputState,
      ...settings,
      generate: onGenerate,
    };

    const gui = new GUI({ container: ref.current, title: "Controls" });

    gui.add(params, "n", 1, 8, 1).onChange((value: number) => {
      onInputChange({ ...inputState, n: value });
    });

    gui.add(params, "l", 0, 7, 1).onChange((value: number) => {
      onInputChange({ ...inputState, l: value });
    });

    gui.add(params, "m", -7, 7, 1).onChange((value: number) => {
      onInputChange({ ...inputState, m: value });
    });

    gui.add(params, "samples", 2000, 120000, 1000).onChange((value: number) => {
      onSettingsChange({ ...settings, samples: value });
    });

    gui.add(params, "pointSize", 0.01, 0.25, 0.005).onChange((value: number) => {
      onSettingsChange({ ...settings, pointSize: value });
    });

    gui.add(params, "opacity", 0.05, 1, 0.01).onChange((value: number) => {
      onSettingsChange({ ...settings, opacity: value });
    });

    gui
      .add(params, "colorMode", ["density", "radius", "z"])
      .onChange((value: OrbitalSettings["colorMode"]) => {
        onSettingsChange({ ...settings, colorMode: value });
      });

    gui.add(params, "showAxes").onChange((value: boolean) => {
      onSettingsChange({ ...settings, showAxes: value });
    });

    gui.add(params, "showNucleus").onChange((value: boolean) => {
      onSettingsChange({ ...settings, showNucleus: value });
    });

    gui.add(params, "autoRotate").onChange((value: boolean) => {
      onSettingsChange({ ...settings, autoRotate: value });
    });

    gui.add(params, "generate").name("Generate / Update Orbital");

    return () => gui.destroy();
  }, [
    visible,
    inputState,
    settings,
    onInputChange,
    onSettingsChange,
    onGenerate,
  ]);

  if (!visible) return null;

  return <div className="control-panel" ref={ref} />;
}
