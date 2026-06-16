export const DEFAULT_L = 1.0;

function derivatives(y1, y2, energy) {
  return { dy1: y2, dy2: -2 * energy * y1 };
}

export function solveWavefunction(energy, { L = DEFAULT_L, steps = 720 } = {}) {
  const h = L / steps;
  const xValues = new Float32Array(steps + 1);
  const psiValues = new Float32Array(steps + 1);
  let x = 0;
  let y1 = 0;
  let y2 = 1;

  for (let i = 1; i <= steps; i += 1) {
    const k1 = derivatives(y1, y2, energy);
    const k2 = derivatives(y1 + h * k1.dy1 / 2, y2 + h * k1.dy2 / 2, energy);
    const k3 = derivatives(y1 + h * k2.dy1 / 2, y2 + h * k2.dy2 / 2, energy);
    const k4 = derivatives(y1 + h * k3.dy1, y2 + h * k3.dy2, energy);
    y1 += h * (k1.dy1 + 2 * k2.dy1 + 2 * k3.dy1 + k4.dy1) / 6;
    y2 += h * (k1.dy2 + 2 * k2.dy2 + 2 * k3.dy2 + k4.dy2) / 6;
    x += h;
    xValues[i] = x;
    psiValues[i] = y1;
  }

  return { xValues, psiValues, residual: psiValues[steps] };
}

export function analyticEigenvalue(n, L = DEFAULT_L) {
  return n * n * Math.PI * Math.PI / (2 * L * L);
}

export function precomputeResidualCurve({
  eMin = 0.2,
  eMax = 50,
  samples = 720,
  L = DEFAULT_L,
  steps = 720,
} = {}) {
  return Array.from({ length: samples }, (_, index) => {
    const energy = eMin + (eMax - eMin) * index / (samples - 1);
    return { energy, residual: solveWavefunction(energy, { L, steps }).residual };
  });
}
