import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webPre = path.resolve(scriptDir, "..");
const root = path.resolve(webPre, "../..");
const resultsDir = path.join(root, "numerical_analysis", "results");
const assetsDir = path.join(webPre, "public", "assets");
const orbitalAssetsDir = path.join(assetsDir, "orbitals");
const katexTarget = path.join(webPre, "public", "vendor", "katex", "dist");

const colors = {
  blue: "#0071e3",
  orange: "#d86600",
  green: "#248a3d",
  ink: "#172b42",
  muted: "#6e7783",
  line: "#d9e0e8",
  panel: "#f7f9fb",
};

function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const keys = header.split(",");
  return lines.map((line) =>
    Object.fromEntries(line.split(",").map((value, index) => [keys[index], value])),
  );
}

async function readCsv(name) {
  const text = await readFile(path.join(resultsDir, name), "utf8");
  return parseCsv(text);
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function svgDocument({ width = 760, height = 420, body, title }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
  <title>${esc(title)}</title>
  <style>
    text { font-family: "Helvetica Neue", "PingFang SC", Arial, sans-serif; fill: ${colors.ink}; }
    .muted { fill: ${colors.muted}; }
    .axis { stroke: ${colors.ink}; stroke-width: 1.25; }
    .grid { stroke: ${colors.line}; stroke-width: 1; }
    .label { font-size: 14px; }
    .small { font-size: 12px; }
  </style>
  ${body}
</svg>`;
}

function pathFromPoints(points) {
  return points.map(([x, y], index) =>
    `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`,
  ).join(" ");
}

function factorial(n) {
  let value = 1;
  for (let i = 2; i <= n; i += 1) value *= i;
  return value;
}

function associatedLegendre(l, mInput, x) {
  const m = Math.abs(mInput);
  let pmm = 1;
  if (m > 0) {
    const root = Math.sqrt(Math.max(0, 1 - x * x));
    let factor = 1;
    for (let i = 1; i <= m; i += 1) {
      pmm *= -factor * root;
      factor += 2;
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

function associatedLaguerre(k, alpha, x) {
  if (k === 0) return 1;
  if (k === 1) return 1 + alpha - x;
  let lm2 = 1;
  let lm1 = 1 + alpha - x;
  let current = lm1;
  for (let n = 2; n <= k; n += 1) {
    current = ((2 * n - 1 + alpha - x) * lm1 - (n - 1 + alpha) * lm2) / n;
    lm2 = lm1;
    lm1 = current;
  }
  return current;
}

function radialR(n, l, r) {
  const rho = 2 * r / n;
  const k = n - l - 1;
  const alpha = 2 * l + 1;
  const norm = Math.sqrt((2 / n) ** 3 * factorial(k) / (2 * n * factorial(n + l)));
  return norm * Math.exp(-rho / 2) * rho ** l * associatedLaguerre(k, alpha, rho);
}

function legendreFamilySvg() {
  const width = 760;
  const height = 420;
  const plot = { x: 65, y: 38, w: 635, h: 310 };
  const xMap = (x) => plot.x + (x + 1) / 2 * plot.w;
  const yMap = (y) => plot.y + (1.2 - y) / 2.4 * plot.h;
  const series = [
    { l: 0, m: 0, color: colors.ink, label: "P₀(x)" },
    { l: 1, m: 0, color: colors.blue, label: "P₁(x)" },
    { l: 2, m: 0, color: colors.orange, label: "P₂(x)" },
    { l: 2, m: 1, color: colors.green, label: "P₂¹(x) / 3" },
  ];
  const curves = series.map(({ l, m, color, label }, seriesIndex) => {
    const points = Array.from({ length: 401 }, (_, index) => {
      const x = -1 + 2 * index / 400;
      const value = associatedLegendre(l, m, x) / (m === 1 ? 3 : 1);
      return [xMap(x), yMap(value)];
    });
    const legendX = plot.x + 330 + (seriesIndex % 2) * 145;
    const legendY = 18 + Math.floor(seriesIndex / 2) * 20;
    return `<path d="${pathFromPoints(points)}" fill="none" stroke="${color}" stroke-width="2.8"/>
      <line x1="${legendX}" y1="${legendY}" x2="${legendX + 25}" y2="${legendY}" stroke="${color}" stroke-width="3"/>
      <text x="${legendX + 32}" y="${legendY + 4}" class="small">${label}</text>`;
  }).join("\n");
  const body = `
    <rect x="${plot.x}" y="${plot.y}" width="${plot.w}" height="${plot.h}" fill="${colors.panel}" stroke="${colors.line}"/>
    ${[-1, -0.5, 0, 0.5, 1].map((tick) => `<line x1="${xMap(tick)}" y1="${plot.y}" x2="${xMap(tick)}" y2="${plot.y + plot.h}" class="grid"/>`).join("")}
    ${[-1, -0.5, 0, 0.5, 1].map((tick) => `<line x1="${plot.x}" y1="${yMap(tick)}" x2="${plot.x + plot.w}" y2="${yMap(tick)}" class="grid"/>`).join("")}
    <line x1="${plot.x}" y1="${yMap(0)}" x2="${plot.x + plot.w}" y2="${yMap(0)}" class="axis"/>
    <line x1="${xMap(0)}" y1="${plot.y}" x2="${xMap(0)}" y2="${plot.y + plot.h}" class="axis"/>
    ${curves}
    ${[-1, -0.5, 0, 0.5, 1].map((tick) => `<text x="${xMap(tick)}" y="${plot.y + plot.h + 22}" text-anchor="middle" class="small muted">${tick}</text>`).join("")}
    <text x="${plot.x + plot.w / 2}" y="${height - 18}" text-anchor="middle" class="label">x = cos θ</text>
    <text x="17" y="${plot.y + plot.h / 2}" class="label" transform="rotate(-90 17 ${plot.y + plot.h / 2})">关联勒让德函数</text>`;
  return svgDocument({ width, height, body, title: "勒让德多项式与关联勒让德函数族" });
}

function effectivePotentialSvg() {
  const width = 760;
  const height = 420;
  const plot = { x: 68, y: 38, w: 625, h: 305 };
  const rMin = 0.35;
  const rMax = 8;
  const yMin = -1.2;
  const yMax = 1.5;
  const xMap = (r) => plot.x + (r - rMin) / (rMax - rMin) * plot.w;
  const yMap = (value) => plot.y + (yMax - value) / (yMax - yMin) * plot.h;
  const series = [
    { l: 0, color: colors.blue },
    { l: 1, color: colors.orange },
    { l: 2, color: colors.green },
  ];
  const curves = series.map(({ l, color }, index) => {
    const points = [];
    for (let i = 0; i <= 550; i += 1) {
      const r = rMin + (rMax - rMin) * i / 550;
      const value = Math.max(yMin, Math.min(yMax, -1 / r + l * (l + 1) / (2 * r * r)));
      points.push([xMap(r), yMap(value)]);
    }
    const legendX = plot.x + 390 + index * 72;
    return `<path d="${pathFromPoints(points)}" fill="none" stroke="${color}" stroke-width="3"/>
      <line x1="${legendX}" y1="20" x2="${legendX + 24}" y2="20" stroke="${color}" stroke-width="3"/>
      <text x="${legendX + 30}" y="24" class="small">l=${l}</text>`;
  }).join("\n");
  const body = `
    <rect x="${plot.x}" y="${plot.y}" width="${plot.w}" height="${plot.h}" fill="${colors.panel}" stroke="${colors.line}"/>
    ${[1, 2, 4, 6, 8].map((tick) => `<line x1="${xMap(tick)}" y1="${plot.y}" x2="${xMap(tick)}" y2="${plot.y + plot.h}" class="grid"/>`).join("")}
    ${[-1, -0.5, 0, 0.5, 1].map((tick) => `<line x1="${plot.x}" y1="${yMap(tick)}" x2="${plot.x + plot.w}" y2="${yMap(tick)}" class="grid"/>`).join("")}
    <line x1="${plot.x}" y1="${yMap(0)}" x2="${plot.x + plot.w}" y2="${yMap(0)}" class="axis"/>
    ${curves}
    ${[1, 2, 4, 6, 8].map((tick) => `<text x="${xMap(tick)}" y="${plot.y + plot.h + 22}" text-anchor="middle" class="small muted">${tick}</text>`).join("")}
    <text x="${plot.x + plot.w / 2}" y="${height - 18}" text-anchor="middle" class="label">r / a₀</text>
    <text x="17" y="${plot.y + plot.h / 2}" class="label" transform="rotate(-90 17 ${plot.y + plot.h / 2})">V_eff / Hartree</text>`;
  return svgDocument({ width, height, body, title: "库仑势中不同角量子数的有效势" });
}

function radialProbabilitySvg() {
  const width = 760;
  const height = 420;
  const plot = { x: 65, y: 38, w: 635, h: 305 };
  const rMax = 20;
  const states = [
    { n: 1, l: 0, color: colors.ink, label: "1s" },
    { n: 2, l: 0, color: colors.orange, label: "2s" },
    { n: 2, l: 1, color: colors.blue, label: "2p" },
    { n: 3, l: 1, color: colors.green, label: "3p" },
  ];
  const samples = states.map((state) => {
    const values = Array.from({ length: 601 }, (_, index) => {
      const r = rMax * index / 600;
      const value = r * r * radialR(state.n, state.l, r) ** 2;
      return { r, value };
    });
    return { ...state, values };
  });
  const globalMax = Math.max(...samples.flatMap((state) => state.values.map((point) => point.value)));
  const xMap = (r) => plot.x + r / rMax * plot.w;
  const yMap = (value) => plot.y + (1 - value / globalMax) * plot.h;
  const curves = samples.map((state, index) => {
    const points = state.values.map(({ r, value }) => [xMap(r), yMap(value)]);
    const legendX = plot.x + 335 + (index % 2) * 125;
    const legendY = 18 + Math.floor(index / 2) * 20;
    return `<path d="${pathFromPoints(points)}" fill="none" stroke="${state.color}" stroke-width="2.8"/>
      <line x1="${legendX}" y1="${legendY}" x2="${legendX + 24}" y2="${legendY}" stroke="${state.color}" stroke-width="3"/>
      <text x="${legendX + 31}" y="${legendY + 4}" class="small">${state.label}</text>`;
  }).join("\n");
  const body = `
    <rect x="${plot.x}" y="${plot.y}" width="${plot.w}" height="${plot.h}" fill="${colors.panel}" stroke="${colors.line}"/>
    ${[0, 5, 10, 15, 20].map((tick) => `<line x1="${xMap(tick)}" y1="${plot.y}" x2="${xMap(tick)}" y2="${plot.y + plot.h}" class="grid"/>`).join("")}
    <line x1="${plot.x}" y1="${plot.y + plot.h}" x2="${plot.x + plot.w}" y2="${plot.y + plot.h}" class="axis"/>
    ${curves}
    ${[0, 5, 10, 15, 20].map((tick) => `<text x="${xMap(tick)}" y="${plot.y + plot.h + 22}" text-anchor="middle" class="small muted">${tick}</text>`).join("")}
    <text x="${plot.x + plot.w / 2}" y="${height - 18}" text-anchor="middle" class="label">r / a₀</text>
    <text x="17" y="${plot.y + plot.h / 2}" class="label" transform="rotate(-90 17 ${plot.y + plot.h / 2})">r² |R_nl(r)|²</text>`;
  return svgDocument({ width, height, body, title: "氢原子不同态的径向概率分布与节点" });
}

function hydrogenEnergySvg() {
  const width = 760;
  const height = 420;
  const plot = { x: 75, y: 38, w: 610, h: 315 };
  const yMin = -14;
  const yMax = 0.8;
  const yMap = (energy) => plot.y + (yMax - energy) / (yMax - yMin) * plot.h;
  const levels = [1, 2, 3, 4, 5].map((n) => ({ n, energy: -13.6 / (n * n) }));
  const levelLines = levels.map(({ n, energy }) => {
    const y = yMap(energy);
    const x1 = plot.x + 70 + n * 10;
    const x2 = plot.x + plot.w - 85 + n * 4;
    return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${n === 1 ? colors.orange : colors.blue}" stroke-width="${n === 1 ? 4 : 3}"/>
      <text x="${x1 - 15}" y="${y + 5}" text-anchor="end" class="label">n=${n}</text>
      <text x="${x2 + 12}" y="${y + 5}" class="small muted">${energy.toFixed(n === 1 ? 1 : 2)} eV</text>`;
  }).join("\n");
  const body = `
    <rect x="${plot.x}" y="${plot.y}" width="${plot.w}" height="${plot.h}" fill="${colors.panel}" stroke="${colors.line}"/>
    ${[-13.6, -10, -5, 0].map((tick) => `<line x1="${plot.x}" y1="${yMap(tick)}" x2="${plot.x + plot.w}" y2="${yMap(tick)}" class="grid"/>
      <text x="${plot.x - 12}" y="${yMap(tick) + 5}" text-anchor="end" class="small muted">${tick}</text>`).join("")}
    ${levelLines}
    <line x1="${plot.x}" y1="${yMap(0)}" x2="${plot.x + plot.w}" y2="${yMap(0)}" stroke="${colors.ink}" stroke-width="1.5" stroke-dasharray="7 5"/>
    <text x="${plot.x + plot.w - 10}" y="${yMap(0) - 9}" text-anchor="end" class="small">电离极限 E=0</text>
    <text x="17" y="${plot.y + plot.h / 2}" class="label" transform="rotate(-90 17 ${plot.y + plot.h / 2})">能量 / eV</text>`;
  return svgDocument({ width, height, body, title: "氢原子能级随主量子数趋近电离极限" });
}

function shootingBoundarySvg() {
  const width = 760;
  const height = 420;
  const plot = { x: 58, y: 36, w: 650, h: 304 };
  const yMin = -0.5;
  const yMax = 0.55;
  const xMap = (x) => plot.x + x * plot.w;
  const yMap = (y) => plot.y + (yMax - y) / (yMax - yMin) * plot.h;
  const energies = [
    { energy: 3.2, color: colors.orange, label: "E = 3.20，未命中", dash: "" },
    { energy: Math.PI ** 2 / 2, color: colors.blue, label: "E₁ = 4.9348，命中", dash: "" },
    { energy: 7.2, color: colors.muted, label: "E = 7.20，越过", dash: "7 5" },
  ];
  const curves = energies.map(({ energy, color, label, dash }) => {
    const k = Math.sqrt(2 * energy);
    const points = Array.from({ length: 241 }, (_, index) => {
      const x = index / 240;
      return [xMap(x), yMap(Math.sin(k * x) / k)];
    });
    return `<path d="${pathFromPoints(points)}" fill="none" stroke="${color}" stroke-width="3" ${dash ? `stroke-dasharray="${dash}"` : ""}/>
      <circle cx="${xMap(1)}" cy="${points.at(-1)[1]}" r="5" fill="${color}"/>
      <text x="${xMap(0.67)}" y="${yMap(Math.sin(k * 0.67) / k) - 10}" class="small" fill="${color}">${esc(label)}</text>`;
  }).join("\n");
  const body = `
    <rect x="${plot.x}" y="${plot.y}" width="${plot.w}" height="${plot.h}" fill="${colors.panel}" stroke="${colors.line}"/>
    <line x1="${plot.x}" y1="${yMap(0)}" x2="${plot.x + plot.w}" y2="${yMap(0)}" class="axis"/>
    <line x1="${plot.x}" y1="${plot.y}" x2="${plot.x}" y2="${plot.y + plot.h}" class="axis"/>
    <line x1="${xMap(1)}" y1="${plot.y}" x2="${xMap(1)}" y2="${plot.y + plot.h}" stroke="${colors.blue}" stroke-width="2" stroke-dasharray="6 5"/>
    ${curves}
    <text x="${plot.x - 30}" y="${yMap(0) + 5}" class="small muted">0</text>
    <text x="${plot.x - 8}" y="${plot.y + plot.h + 25}" class="small muted">0</text>
    <text x="${xMap(1) - 5}" y="${plot.y + plot.h + 25}" class="small muted">L</text>
    <text x="${plot.x + plot.w / 2 - 18}" y="${height - 18}" class="label">位置 x</text>
    <text x="14" y="${plot.y + plot.h / 2}" class="label" transform="rotate(-90 14 ${plot.y + plot.h / 2})">波函数 ψ_E(x)</text>
    <text x="${xMap(1) - 68}" y="${plot.y + 18}" class="small" fill="${colors.blue}">右边界 x=L</text>`;
  return svgDocument({ width, height, body, title: "不同猜测能量对应的波函数与右端边界残差" });
}

function residualFunctionSvg() {
  const width = 760;
  const height = 420;
  const plot = { x: 62, y: 35, w: 650, h: 304 };
  const eMin = 0.2;
  const eMax = 50;
  const yMin = -0.25;
  const yMax = 1.02;
  const residual = (energy) => Math.sin(Math.sqrt(2 * energy)) / Math.sqrt(2 * energy);
  const xMap = (energy) => plot.x + (energy - eMin) / (eMax - eMin) * plot.w;
  const yMap = (value) => plot.y + (yMax - value) / (yMax - yMin) * plot.h;
  const points = Array.from({ length: 801 }, (_, index) => {
    const energy = eMin + (eMax - eMin) * index / 800;
    return [xMap(energy), yMap(residual(energy))];
  });
  const eigenMarkers = [1, 2, 3].map((n) => {
    const energy = n * n * Math.PI ** 2 / 2;
    const x = xMap(energy);
    return `<line x1="${x}" y1="${plot.y}" x2="${x}" y2="${plot.y + plot.h}" stroke="${colors.orange}" stroke-width="1.2" stroke-dasharray="5 5" opacity="0.65"/>
      <circle cx="${x}" cy="${yMap(0)}" r="5" fill="${colors.orange}"/>
      <text x="${x}" y="${yMap(0) + (n === 2 ? 28 : -12)}" text-anchor="middle" class="small" fill="${colors.orange}">E${["₀", "₁", "₂", "₃"][n]}</text>`;
  }).join("\n");
  const body = `
    <rect x="${plot.x}" y="${plot.y}" width="${plot.w}" height="${plot.h}" fill="${colors.panel}" stroke="${colors.line}"/>
    ${[10, 20, 30, 40, 50].map((tick) => `<line x1="${xMap(tick)}" y1="${plot.y}" x2="${xMap(tick)}" y2="${plot.y + plot.h}" class="grid"/>`).join("")}
    <line x1="${plot.x}" y1="${yMap(0)}" x2="${plot.x + plot.w}" y2="${yMap(0)}" class="axis"/>
    <line x1="${plot.x}" y1="${plot.y}" x2="${plot.x}" y2="${plot.y + plot.h}" class="axis"/>
    <path d="${pathFromPoints(points)}" fill="none" stroke="${colors.blue}" stroke-width="3"/>
    ${eigenMarkers}
    ${[0, 10, 20, 30, 40, 50].map((tick) => `<text x="${xMap(Math.max(eMin, tick))}" y="${plot.y + plot.h + 23}" text-anchor="middle" class="small muted">${tick}</text>`).join("")}
    <text x="${plot.x + plot.w / 2}" y="${height - 17}" text-anchor="middle" class="label">猜测能量 E</text>
    <text x="15" y="${plot.y + plot.h / 2}" class="label" transform="rotate(-90 15 ${plot.y + plot.h / 2})">F(E)=ψ_E(L)</text>`;
  return svgDocument({ width, height, body, title: "打靶法残差函数与前三个本征值零点" });
}

async function errorComparisonSvg() {
  const rows = await readCsv("energy_comparison.csv");
  const fd = rows.filter((row) =>
    row.problem === "Infinite square well"
    && row.method === "Finite difference"
    && Number(row.level) <= 3,
  );
  const shooting = rows.filter((row) =>
    row.problem === "Infinite square well"
    && row.method === "Shooting"
    && Number(row.level) <= 3,
  );
  const width = 760;
  const height = 420;
  const plot = { x: 82, y: 38, w: 610, h: 300 };
  const logMin = -13;
  const logMax = 0;
  const yMap = (value) => plot.y + (logMax - Math.log10(value)) / (logMax - logMin) * plot.h;
  const groupWidth = plot.w / 3;
  const barWidth = 48;
  const bars = [0, 1, 2].map((index) => {
    const center = plot.x + groupWidth * (index + 0.5);
    const fdValue = Number(fd[index].absolute_error);
    const shootValue = Number(shooting[index].absolute_error);
    const bottom = yMap(10 ** logMin);
    return `<rect x="${center - barWidth - 6}" y="${yMap(fdValue)}" width="${barWidth}" height="${bottom - yMap(fdValue)}" fill="${colors.blue}"/>
      <rect x="${center + 6}" y="${yMap(shootValue)}" width="${barWidth}" height="${bottom - yMap(shootValue)}" fill="${colors.orange}"/>
      <text x="${center}" y="${plot.y + plot.h + 25}" text-anchor="middle" class="label">n = ${index + 1}</text>`;
  }).join("\n");
  const ticks = [0, -3, -6, -9, -12].map((exponent) => {
    const y = yMap(10 ** exponent);
    return `<line x1="${plot.x}" y1="${y}" x2="${plot.x + plot.w}" y2="${y}" class="grid"/>
      <text x="${plot.x - 12}" y="${y + 5}" text-anchor="end" class="small muted">10${String(exponent).replace("-", "⁻").replace("0", "⁰").replace("1", "¹").replace("2", "²").replace("3", "³").replace("6", "⁶").replace("9", "⁹")}</text>`;
  }).join("\n");
  const body = `
    <rect x="${plot.x}" y="${plot.y}" width="${plot.w}" height="${plot.h}" fill="${colors.panel}" stroke="${colors.line}"/>
    ${ticks}
    ${bars}
    <rect x="${plot.x + 370}" y="12" width="13" height="13" fill="${colors.blue}"/><text x="${plot.x + 390}" y="23" class="small">差分法</text>
    <rect x="${plot.x + 455}" y="12" width="13" height="13" fill="${colors.orange}"/><text x="${plot.x + 475}" y="23" class="small">打靶法</text>
    <text x="18" y="${plot.y + plot.h / 2}" class="label" transform="rotate(-90 18 ${plot.y + plot.h / 2})">绝对误差 |E_num−E_exact|</text>`;
  return svgDocument({ width, height, body, title: "差分法和打靶法的绝对误差量级比较" });
}

async function methodErrorScaleSvg() {
  const rows = await readCsv("energy_comparison.csv");
  const pick = (problem, method, level) => rows.find((row) =>
    row.problem === problem && row.method === method && Number(row.level) === level
  );
  const wellFd1 = pick("Infinite square well", "Finite difference", 1);
  const wellFd5 = pick("Infinite square well", "Finite difference", 5);
  const wellShoot1 = pick("Infinite square well", "Shooting", 1);
  const hoFd0 = pick("Harmonic oscillator", "Finite difference", 0);
  const hoShoot0 = pick("Harmonic oscillator", "Shooting", 0);
  const items = [
    {
      label: "势阱 FD n=1",
      value: Number(wellFd1.relative_error_percent),
      color: colors.blue,
      note: `${Number(wellFd1.relative_error_percent).toExponential(2)}%`,
    },
    {
      label: "势阱 FD n=5",
      value: Number(wellFd5.relative_error_percent),
      color: colors.blue,
      note: `${Number(wellFd5.relative_error_percent).toExponential(2)}%`,
    },
    {
      label: "势阱 Shooting",
      value: Number(wellShoot1.absolute_error),
      color: colors.orange,
      note: `abs ${Number(wellShoot1.absolute_error).toExponential(2)}`,
    },
    {
      label: "谐振子 FD",
      value: Number(hoFd0.relative_error_percent),
      color: colors.blue,
      note: `${Number(hoFd0.relative_error_percent).toExponential(2)}%`,
    },
    {
      label: "谐振子 Shooting",
      value: Number(hoShoot0.relative_error_percent),
      color: colors.orange,
      note: `${Number(hoShoot0.relative_error_percent).toExponential(2)}%`,
    },
  ];
  const width = 760;
  const height = 420;
  const plot = { x: 96, y: 42, w: 610, h: 274 };
  const logMin = -12;
  const logMax = 0;
  const yMap = (value) => plot.y + (logMax - Math.log10(value)) / (logMax - logMin) * plot.h;
  const bottom = yMap(10 ** logMin);
  const barW = 58;
  const ticks = [0, -2, -4, -6, -8, -10, -12].map((exponent) => {
    const y = yMap(10 ** exponent);
    const label = exponent === 0 ? "1" : `10${String(exponent).replace("-", "⁻").replace("1", "¹").replace("2", "²").replace("4", "⁴").replace("6", "⁶").replace("8", "⁸").replace("0", "⁰")}`;
    return `<line x1="${plot.x}" y1="${y}" x2="${plot.x + plot.w}" y2="${y}" class="grid"/>
      <text x="${plot.x - 14}" y="${y + 5}" text-anchor="end" class="small muted">${label}</text>`;
  }).join("\n");
  const bars = items.map((item, index) => {
    const center = plot.x + (index + 0.55) * plot.w / items.length;
    const y = yMap(item.value);
    return `<rect x="${center - barW / 2}" y="${y}" width="${barW}" height="${bottom - y}" rx="4" fill="${item.color}"/>
      <text x="${center}" y="${plot.y + plot.h + 25}" text-anchor="middle" class="small">${item.label}</text>
      <text x="${center}" y="${y - 8}" text-anchor="middle" class="small muted">${item.note}</text>`;
  }).join("\n");
  const body = `
    <rect x="${plot.x}" y="${plot.y}" width="${plot.w}" height="${plot.h}" fill="${colors.panel}" stroke="${colors.line}"/>
    ${ticks}
    ${bars}
    <rect x="${plot.x + 385}" y="16" width="13" height="13" fill="${colors.blue}"/><text x="${plot.x + 405}" y="27" class="small">差分法</text>
    <rect x="${plot.x + 475}" y="16" width="13" height="13" fill="${colors.orange}"/><text x="${plot.x + 495}" y="27" class="small">打靶法</text>
    <text x="24" y="${plot.y + plot.h / 2}" class="label" transform="rotate(-90 24 ${plot.y + plot.h / 2})">误差量级（对数坐标）</text>`;
  return svgDocument({ width, height, body, title: "不同数值方法误差量级对比" });
}

async function main() {
  await mkdir(assetsDir, { recursive: true });
  await mkdir(orbitalAssetsDir, { recursive: true });
  await rm(path.join(webPre, "public", "vendor", "katex"), { recursive: true, force: true });
  await mkdir(katexTarget, { recursive: true });

  await copyFile(
    path.join(root, "presentation", "marp", "assets", "energy-levels.svg"),
    path.join(assetsDir, "energy-levels.svg"),
  );
  for (const file of ["1s.png", "2pz.png", "3pz.png", "3dz2.png"]) {
    await copyFile(
      path.join(root, "presentation", "classroom-report", "assets", "orbitals", file),
      path.join(orbitalAssetsDir, file),
    );
  }
  await copyFile(
    path.join(root, "presentation", "marp", "assets", "convergence.svg"),
    path.join(assetsDir, "convergence.svg"),
  );
  await cp(path.join(webPre, "node_modules", "katex", "dist"), katexTarget, { recursive: true });

  await Promise.all([
    writeFile(path.join(assetsDir, "shooting-boundary.svg"), shootingBoundarySvg()),
    writeFile(path.join(assetsDir, "residual-function.svg"), residualFunctionSvg()),
    writeFile(path.join(assetsDir, "error-comparison.svg"), await errorComparisonSvg()),
    writeFile(path.join(assetsDir, "method-error-scale.svg"), await methodErrorScaleSvg()),
    writeFile(path.join(assetsDir, "legendre-family.svg"), legendreFamilySvg()),
    writeFile(path.join(assetsDir, "effective-potential.svg"), effectivePotentialSvg()),
    writeFile(path.join(assetsDir, "radial-probability.svg"), radialProbabilitySvg()),
    writeFile(path.join(assetsDir, "hydrogen-energy.svg"), hydrogenEnergySvg()),
  ]);

  console.log(`Generated presentation assets in ${assetsDir}`);
}

await main();
