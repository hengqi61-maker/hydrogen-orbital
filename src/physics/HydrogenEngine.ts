import type {
  OrbitalData,
  OrbitalPoint,
  QuantumState,
  ValidationResult,
} from "./HydrogenTypes";

const PI = Math.PI;

function factorial(n: number): number {
  let value = 1;
  for (let i = 2; i <= n; i += 1) value *= i;
  return value;
}

function associatedLaguerre(k: number, alpha: number, x: number): number {
  if (k === 0) return 1;
  if (k === 1) return 1 + alpha - x;

  let lm2 = 1;
  let lm1 = 1 + alpha - x;
  let l = lm1;

  for (let n = 2; n <= k; n += 1) {
    l = ((2 * n - 1 + alpha - x) * lm1 - (n - 1 + alpha) * lm2) / n;
    lm2 = lm1;
    lm1 = l;
  }

  return l;
}

function associatedLegendre(l: number, m: number, x: number): number {
  m = Math.abs(m);

  let pmm = 1;

  if (m > 0) {
    const somx2 = Math.sqrt(Math.max(0, 1 - x * x));
    let fact = 1;

    for (let i = 1; i <= m; i += 1) {
      pmm *= -fact * somx2;
      fact += 2;
    }
  }

  if (l === m) return pmm;

  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmmp1;

  let pll = 0;
  for (let ll = m + 2; ll <= l; ll += 1) {
    pll = ((2 * ll - 1) * x * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }

  return pll;
}

function radialR(n: number, l: number, r: number): number {
  const rho = (2 * r) / n;
  const k = n - l - 1;
  const alpha = 2 * l + 1;

  const norm = Math.sqrt(
    Math.pow(2 / n, 3) * (factorial(k) / (2 * n * factorial(n + l))),
  );

  return (
    norm *
    Math.exp(-rho / 2) *
    Math.pow(rho, l) *
    associatedLaguerre(k, alpha, rho)
  );
}

function sphericalYAbs2(l: number, m: number, theta: number): number {
  const absM = Math.abs(m);
  const x = Math.cos(theta);
  const p = associatedLegendre(l, absM, x);

  const norm =
    ((2 * l + 1) / (4 * PI)) * (factorial(l - absM) / factorial(l + absM));

  return norm * p * p;
}

function orbitalName({ n, l, m }: QuantumState): string {
  const letters = ["s", "p", "d", "f", "g", "h"];
  const shell = letters[l] ?? `l${l}`;

  if (l === 0) return `${n}s`;
  if (l === 1 && m === 0) return `${n}p_z`;
  if (l === 2 && m === 0) return `${n}d_z²`;

  return `${n}${shell}_m${m}`;
}

function validateState(state: QuantumState): ValidationResult {
  const { n, l, m } = state;

  if (!Number.isInteger(n) || n < 1) {
    return { valid: false, message: "n 必须为整数，且 n >= 1。" };
  }

  if (!Number.isInteger(l) || l < 0 || l >= n) {
    return {
      valid: false,
      message: `l 必须满足 0 <= l < n。当前 n=${n}，所以 l 合法范围是 0 到 ${
        n - 1
      }。`,
    };
  }

  if (!Number.isInteger(m) || m < -l || m > l) {
    return {
      valid: false,
      message: `m 必须满足 -l <= m <= l。当前 l=${l}，所以 m 合法范围是 ${-l} 到 ${l}。`,
    };
  }

  return { valid: true };
}

function buildRadialSampler(n: number, l: number) {
  const rMax = Math.max(30, 8 * n * n);
  const steps = 3000;
  const dr = rMax / steps;

  const rValues: number[] = [];
  const pdf: number[] = [];
  const cdf: number[] = [];

  let integral = 0;
  let peakR = 0;
  let peakP = -Infinity;

  for (let i = 0; i <= steps; i += 1) {
    const r = i * dr;
    const radial = radialR(n, l, r);
    const p = r * r * radial * radial;

    rValues.push(r);
    pdf.push(p);

    if (p > peakP) {
      peakP = p;
      peakR = r;
    }

    if (i > 0) {
      integral += 0.5 * (pdf[i - 1] + pdf[i]) * dr;
    }

    cdf.push(integral);
  }

  for (let i = 0; i < cdf.length; i += 1) cdf[i] /= integral;

  function sampleR(): number {
    const u = Math.random();
    let lo = 0;
    let hi = cdf.length - 1;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }

    return rValues[lo];
  }

  return {
    sampleR,
    peakR,
    normalization: integral,
  };
}

function buildAngularSampler(l: number, m: number) {
  let ymax = 0;

  for (let i = 0; i <= 1000; i += 1) {
    const theta = (PI * i) / 1000;
    ymax = Math.max(ymax, sphericalYAbs2(l, m, theta));
  }

  function sampleAngles() {
    while (true) {
      const u = Math.random();
      const cosTheta = 2 * u - 1;
      const theta = Math.acos(cosTheta);
      const phi = 2 * PI * Math.random();
      const yAbs2 = sphericalYAbs2(l, m, theta);

      if (Math.random() * ymax <= yAbs2) {
        return { theta, phi, yAbs2 };
      }
    }
  }

  return { sampleAngles };
}

export class HydrogenEngine {
  static validateState = validateState;

  static generate(state: QuantumState, samples: number): OrbitalData {
    const validation = validateState(state);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const { n, l, m } = state;
    const radialSampler = buildRadialSampler(n, l);
    const angularSampler = buildAngularSampler(l, m);

    const points: OrbitalPoint[] = [];

    for (let i = 0; i < samples; i += 1) {
      const r = radialSampler.sampleR();
      const { theta, phi, yAbs2 } = angularSampler.sampleAngles();
      const sinTheta = Math.sin(theta);

      const x = r * sinTheta * Math.cos(phi);
      const y = r * sinTheta * Math.sin(phi);
      const z = r * Math.cos(theta);

      const radial = radialR(n, l, r);
      const density = radial * radial * yAbs2;

      points.push({ x, y, z, r, density });
    }

    return {
      state,
      name: orbitalName(state),
      radialNodes: n - l - 1,
      angularNodes: l,
      energyText: `E proportional to -1/${n}² = -1/${n * n}`,
      rPeak: radialSampler.peakR,
      normalization: radialSampler.normalization,
      points,
    };
  }
}
