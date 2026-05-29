export type ColorMode = "density" | "radius" | "z";

export interface QuantumState {
  n: number;
  l: number;
  m: number;
}

export interface OrbitalSettings {
  samples: number;
  pointSize: number;
  opacity: number;
  colorMode: ColorMode;
  showAxes: boolean;
  showNucleus: boolean;
  autoRotate: boolean;
}

export interface OrbitalPoint {
  x: number;
  y: number;
  z: number;
  r: number;
  density: number;
}

export interface OrbitalData {
  state: QuantumState;
  name: string;
  radialNodes: number;
  angularNodes: number;
  energyText: string;
  rPeak: number;
  normalization: number;
  points: OrbitalPoint[];
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}
