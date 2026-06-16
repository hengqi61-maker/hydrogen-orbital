import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const pptxgen = require("/Users/qi-heng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pptxgenjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const assets = path.join(root, "presentation/web-pre/public/assets");
const outputs = path.join(root, "outputs");
const output = path.join(outputs, "quantum-numerical-central-potential-editable.pptx");
const injectScript = path.join(__dirname, "inject-editable-equations.py");
const preUrl = "https://hengqi61-maker.github.io/hydrogen-orbital/pre/#/5";
const projectUrl = "https://hengqi61-maker.github.io/hydrogen-orbital/";

mkdirSync(outputs, { recursive: true });

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Qi-Heng";
pptx.company = "Computational Physics";
pptx.subject = "Editable quantum mechanics presentation";
pptx.title = "量子本征值问题：数值方法与中心势解析结构（可编辑版）";
pptx.lang = "zh-CN";
pptx.theme = {
  headFontFace: "PingFang SC",
  bodyFontFace: "PingFang SC",
  lang: "zh-CN",
};
pptx.defineSlideMaster({
  title: "BASE",
  background: { color: "FFFFFF" },
  objects: [],
});

const C = {
  ink: "172B42",
  muted: "66778D",
  subtle: "EEF2F7",
  panel: "F7F9FC",
  line: "D7E0EA",
  blue: "0071E3",
  blueSoft: "EAF3FF",
  orange: "D86600",
  orangeSoft: "FFF3E8",
  green: "248A3D",
  greenSoft: "EAF7EE",
  white: "FFFFFF",
  black: "05070D",
};
const CN = "PingFang SC";
const EN = "Helvetica Neue";
const MATH = "Cambria Math";

function addBg(slide) {
  slide.background = { color: C.white };
}

function addKicker(slide, text) {
  slide.addText(text, {
    x: 0.46, y: 0.28, w: 5.2, h: 0.18,
    fontFace: EN, fontSize: 7.8, bold: true, charSpacing: 2.3,
    color: C.blue, margin: 0,
  });
}

function addTitle(slide, title, opts = {}) {
  slide.addText(title, {
    x: opts.x ?? 0.46, y: opts.y ?? 0.52,
    w: opts.w ?? 12.15, h: opts.h ?? 0.52,
    fontFace: CN, fontSize: opts.fontSize ?? 24,
    bold: true, color: C.ink, margin: 0,
    breakLine: false, fit: "shrink",
  });
}

function addText(slide, text, x, y, w, h, opts = {}) {
  slide.addText(text, {
    x, y, w, h,
    fontFace: opts.fontFace ?? CN,
    fontSize: opts.fontSize ?? 10.5,
    bold: opts.bold ?? false,
    italic: opts.italic ?? false,
    color: opts.color ?? C.ink,
    margin: opts.margin ?? 0.03,
    align: opts.align ?? "left",
    valign: opts.valign ?? "top",
    fit: opts.fit ?? "shrink",
    breakLine: opts.breakLine,
    hyperlink: opts.hyperlink,
  });
}

function addBullets(slide, items, x, y, w, h, opts = {}) {
  slide.addText(items.map((item, i) => ({
    text: item,
    options: { bullet: { indent: 12 }, breakLine: i < items.length - 1 },
  })), {
    x, y, w, h,
    fontFace: CN, fontSize: opts.fontSize ?? 10.5,
    color: opts.color ?? C.ink,
    breakLine: false,
    fit: "shrink",
    paraSpaceAfterPt: opts.paraSpaceAfterPt ?? 4,
  });
}

function addCard(slide, x, y, w, h, opts = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.08,
    fill: { color: opts.fill ?? C.panel },
    line: { color: opts.line ?? C.line, width: opts.lineWidth ?? 0.8 },
  });
  if (opts.accent) {
    slide.addShape(pptx.ShapeType.rect, {
      x, y, w, h: opts.accentHeight ?? 0.04,
      fill: { color: opts.accent },
      line: { color: opts.accent },
    });
  }
}

function addEq(slide, key, x, y, w, h, opts = {}) {
  if (opts.box !== false) addCard(slide, x, y, w, h, { fill: opts.fill ?? C.panel, line: opts.line ?? C.line });
  slide.addText(`[[EQ:${key}]]`, {
    x: x + 0.04, y: y + 0.03, w: w - 0.08, h: h - 0.06,
    fontFace: MATH,
    fontSize: opts.fontSize ?? 14,
    color: opts.color ?? C.ink,
    margin: 0,
    align: opts.align ?? "center",
    valign: "mid",
    fit: "shrink",
  });
}

function addImage(slide, file, x, y, w, h, opts = {}) {
  slide.addImage({
    path: path.join(assets, file),
    x, y, w, h,
    sizing: opts.fit ? { type: opts.fit, w, h } : opts.sizing,
    transparency: opts.transparency,
    altText: opts.altText ?? file,
  });
}

function addLine(slide, x, y, w, h = 0, color = C.line, width = 0.6) {
  slide.addShape(pptx.ShapeType.line, { x, y, w, h, line: { color, width } });
}

function addFooter(slide, page) {
  addText(slide, String(page), 12.58, 7.18, 0.25, 0.12, {
    fontFace: EN, fontSize: 6.8, color: "8A9AAD", align: "right",
  });
}

function addSectionLabel(slide, text, x, y, w = 3.2, color = C.blue) {
  addText(slide, text, x, y, w, 0.18, {
    fontSize: 7.4, bold: true, color, fontFace: CN,
  });
}

function addNote(slide, note) {
  slide.addNotes(note);
}

function makeSlide(kicker, title, page, note) {
  const slide = pptx.addSlide("BASE");
  addBg(slide);
  addKicker(slide, kicker);
  addTitle(slide, title);
  addFooter(slide, page);
  addNote(slide, note);
  return slide;
}

function addMiniTable(slide, rows, x, y, w, h, colW, opts = {}) {
  slide.addTable(rows, {
    x, y, w, h, colW,
    border: { type: "solid", color: opts.border ?? C.line, pt: 0.45 },
    margin: 0.05,
    fontFace: opts.fontFace ?? CN,
    fontSize: opts.fontSize ?? 8.6,
    color: C.ink,
    valign: "mid",
    fit: "shrink",
  });
}

function slide01() {
  const s = makeSlide("FINITE DIFFERENCE · HAMILTONIAN", "空间离散后，薛定谔方程成为 100×100 矩阵本征值问题。", 1,
    "先从连续薛定谔方程出发，说明边界条件、内部网格、中心差分和三对角矩阵之间的关系。");
  addSectionLabel(s, "连续方程与边界条件", 0.46, 1.24);
  addEq(s, "schrodinger_1d", 0.46, 1.45, 3.95, 0.55);
  addEq(s, "boundary_well", 0.46, 2.13, 3.95, 0.45, { fontSize: 12 });
  addSectionLabel(s, "100 个内部点", 0.46, 2.85);
  addEq(s, "grid_dx", 0.46, 3.05, 3.95, 0.55, { fontSize: 11.2 });
  addSectionLabel(s, "中心差分", 0.46, 3.9);
  addEq(s, "central_diff", 0.46, 4.1, 3.95, 0.68, { fontSize: 11 });
  addEq(s, "discrete_eq", 0.46, 4.95, 5.35, 0.65, { fontSize: 10.6, fill: C.blueSoft });
  addEq(s, "eigen_problem", 5.8, 5.02, 1.5, 0.5, { fontSize: 16, fill: C.white });

  addSectionLabel(s, "三对角 Hamiltonian", 6.15, 1.24);
  const x = 6.12, y = 1.55, cw = 0.66, ch = 0.43;
  const mat = [
    ["10201", "−5100.5", "0", "⋯", "0"],
    ["−5100.5", "10201", "−5100.5", "⋯", "0"],
    ["0", "−5100.5", "10201", "⋯", "0"],
    ["⋮", "⋮", "⋮", "⋱", "−5100.5"],
    ["0", "0", "0", "−5100.5", "10201"],
  ];
  mat.forEach((row, i) => row.forEach((cell, j) => {
    addCard(s, x + j * cw, y + i * ch, cw, ch, {
      fill: i === j ? C.blueSoft : (Math.abs(i - j) === 1 ? C.orangeSoft : C.white),
      line: "CBD6E3",
    });
    addText(s, cell, x + j * cw + 0.02, y + i * ch + 0.12, cw - 0.04, 0.12, {
      fontFace: EN, fontSize: cell.length > 5 ? 6.5 : 8.5, align: "center", color: C.ink,
    });
  }));
  addText(s, "主对角元", 9.8, 1.58, 1.0, 0.17, { fontSize: 8, bold: true, color: C.blue });
  addText(s, "1/Δx² = 10201", 9.8, 1.82, 1.55, 0.18, { fontFace: EN, fontSize: 9.5, color: C.ink });
  addText(s, "次对角元", 9.8, 2.24, 1.0, 0.17, { fontSize: 8, bold: true, color: C.orange });
  addText(s, "−1/(2Δx²) = −5100.5", 9.8, 2.48, 1.8, 0.18, { fontFace: EN, fontSize: 9.5, color: C.ink });
  addCard(s, 8.85, 4.32, 3.75, 0.72, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "本征值就是允许能量；本征向量就是离散波函数。", 9.05, 4.55, 3.35, 0.18, { fontSize: 11.5, bold: true });
}

function slide02() {
  const s = makeSlide("EIGENVALUE CHECK · NUMERICAL VS ANALYTICAL", "没有代入解析能量公式，矩阵仍复现了最低五个能级。", 2,
    "强调计算流程：先求矩阵本征值，解析公式只在最后用于验证。");
  addImage(s, "energy-levels.svg", 0.58, 1.47, 5.35, 3.15);
  addText(s, "能级对比图", 0.58, 1.22, 1.2, 0.18, { color: C.blue, bold: true, fontSize: 8 });
  const header = [
    { text: "n", options: { bold: true, fill: { color: C.blueSoft } } },
    { text: "差分解", options: { bold: true, fill: { color: C.blueSoft } } },
    { text: "解析解", options: { bold: true, fill: { color: C.blueSoft } } },
    { text: "带符号相对误差", options: { bold: true, fill: { color: C.blueSoft } } },
  ];
  const data = [
    ["1", "4.934404", "4.934802", "−0.00806%"],
    ["2", "19.732844", "19.739209", "−0.03225%"],
    ["3", "44.381001", "44.413220", "−0.07254%"],
    ["4", "78.855032", "78.956835", "−0.12894%"],
    ["5", "123.121584", "123.370055", "−0.20140%"],
  ].map((r) => r.map((text, i) => ({ text, options: { color: i === 3 ? C.orange : C.ink } })));
  addMiniTable(s, [header, ...data], 6.65, 1.35, 5.9, 2.1, [0.45, 1.55, 1.55, 2.35], { fontSize: 9.2 });
  addEq(s, "energy_well", 6.65, 3.78, 2.15, 0.45, { fontSize: 14 });
  addCard(s, 9.0, 3.52, 3.55, 1.05, { fill: C.panel, line: C.line });
  addBullets(s, [
    "eigh_tridiagonal(..., select_range=(0,4)) 只取最低五个本征值",
    "解析公式只在计算完成后用于验证",
    "数值能级均略低于解析值，误差随 n 升高而增大",
  ], 9.18, 3.68, 3.12, 0.7, { fontSize: 8.5, paraSpaceAfterPt: 2 });
}

function slide03() {
  const s = makeSlide("ERROR ANALYSIS · GRID CONVERGENCE", "离散误差按 Δx² 收敛，但高能级会放大误差。", 3,
    "说明误差主要来自二阶导数中心差分，网格加倍误差约降为四分之一，高能级误差更大。");
  addSectionLabel(s, "中心差分的泰勒展开", 0.55, 1.17);
  addEq(s, "taylor_error", 0.55, 1.42, 5.0, 0.72, { fontSize: 10.2 });
  addText(s, "主误差：O(Δx²)", 0.7, 2.35, 2.2, 0.22, { color: C.blue, bold: true, fontSize: 15 });
  addEq(s, "fd_closed", 0.55, 2.78, 5.0, 0.62, { fontSize: 11.5 });
  addEq(s, "rel_error", 0.55, 3.63, 5.0, 0.68, { fontSize: 10.5, fill: C.orangeSoft, line: "F0C69C" });
  addImage(s, "convergence.svg", 6.05, 1.2, 6.35, 4.25);
  addCard(s, 6.2, 5.78, 6.05, 0.5, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "N 近似加倍，Δx 减半，因此误差约变为原来的 1/4；同一网格下 n=5 误差始终大于 n=1。", 6.4, 5.94, 5.65, 0.15, { fontSize: 9.5, bold: true });
}

function slide04() {
  const s = makeSlide("SHOOTING METHOD · BOUNDARY HIT", "不建矩阵，而是调节能量直到波函数打中边界。", 4,
    "打靶法把本征值问题改写成初值问题。对每个 E 积分一次，看右端是否满足边界。");
  addSectionLabel(s, "01 · 把本征值问题改写成初值问题", 0.55, 1.2);
  addEq(s, "ode_second", 0.55, 1.47, 5.2, 0.55);
  addText(s, "令 y₁=ψ, y₂=ψ′，二阶方程变成一阶系统：", 0.65, 2.25, 4.5, 0.2, { fontSize: 10 });
  addEq(s, "ode_system", 0.55, 2.58, 5.2, 0.52, { fontSize: 13 });
  addEq(s, "initial_cond", 0.55, 3.38, 5.2, 0.5, { fontSize: 13, fill: C.blueSoft });
  addText(s, "初始斜率只固定非零振幅，求得 ψE(x) 后再归一化。", 0.65, 4.14, 4.6, 0.2, { fontSize: 10, color: C.muted });
  addSectionLabel(s, "02 · 右端残差决定是否命中", 6.35, 1.2);
  addImage(s, "shooting-boundary.svg", 6.35, 1.55, 5.8, 3.25);
  addCard(s, 6.55, 5.05, 5.35, 0.62, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "打靶法的核心：把本征值条件转化成“右端边界残差为零”的求根问题。", 6.78, 5.25, 4.9, 0.17, { fontSize: 10.5, bold: true });
}

function slide05() {
  const s = makeSlide("ROOT FINDING · EIGENVALUE SEARCH", "打靶法把量子化条件变成一个求根问题。", 5,
    "残差函数 F(E)=ψE(L)，每个零点对应一个允许能量。");
  addSectionLabel(s, "残差函数：右边界是否命中？", 0.55, 1.2);
  addEq(s, "residual", 0.55, 1.48, 3.55, 0.56);
  addText(s, "每一个过零点对应一个允许能量；本题解析零点满足：", 0.65, 2.28, 3.25, 0.3, { fontSize: 9.8 });
  addEq(s, "shooting_energy", 0.55, 2.75, 3.55, 0.48, { fontSize: 13.2 });
  addImage(s, "residual-function.svg", 4.55, 1.2, 3.35, 2.8);
  const header = ["n", "打靶法", "解析解", "绝对误差"].map((t) => ({ text: t, options: { bold: true, fill: { color: C.blueSoft } } }));
  const rows = [
    ["1", "4.934802200552", "4.934802200545", "7.27×10⁻¹²"],
    ["2", "19.739208802208", "19.739208802179", "2.93×10⁻¹¹"],
    ["3", "44.413219804971", "44.413219804902", "6.84×10⁻¹¹"],
  ];
  addMiniTable(s, [header, ...rows], 8.15, 1.25, 4.55, 1.72, [0.35, 1.45, 1.45, 1.3], { fontSize: 7.4 });
  addCard(s, 8.15, 3.25, 4.55, 1.15, { fill: C.panel, line: C.line });
  addBullets(s, ["猜测 E", "ODE 积分", "计算 F(E)", "Brent 求根"], 8.35, 3.47, 3.9, 0.58, { fontSize: 9.5, paraSpaceAfterPt: 1 });
  addCard(s, 0.55, 5.22, 12.15, 0.48, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "关键困难：打靶法不能一次性得到所有能级，需要逐个寻找 F(E) 的零点。", 0.78, 5.38, 11.6, 0.12, { fontSize: 10.5, bold: true });
}

function slide06() {
  const s = makeSlide("LIVE DEMO · RESIDUAL FUNCTION", "现在直接调节 E，观察波函数如何命中右边界。", 6,
    `PPT 中点击“打开在线互动页”进入真实网页互动版：${preUrl}`);
  addSectionLabel(s, "波函数打靶区", 0.75, 1.2);
  addSectionLabel(s, "残差函数求根区", 6.8, 1.2);
  addImage(s, "shooting-boundary.svg", 0.85, 1.55, 5.55, 3.05);
  addImage(s, "residual-function.svg", 6.75, 1.55, 5.55, 3.05);
  addCard(s, 0.6, 5.12, 1.15, 0.48, { fill: C.panel, line: C.line });
  addText(s, "当前能量\nE = 3.2000", 0.7, 5.22, 0.85, 0.25, { fontSize: 7.8, bold: true });
  addCard(s, 1.88, 5.12, 1.35, 0.48, { fill: C.panel, line: C.line });
  addText(s, "右端残差\nF(E)=2.270e-1", 1.98, 5.22, 1.0, 0.25, { fontSize: 7.8, bold: true });
  addCard(s, 3.38, 5.12, 1.5, 0.48, { fill: C.panel, line: C.line });
  addText(s, "状态\n仍在零线上方", 3.48, 5.22, 1.12, 0.25, { fontSize: 7.8, bold: true });
  s.addShape(pptx.ShapeType.roundRect, { x: 5.02, y: 5.12, w: 0.7, h: 0.42, fill: { color: C.blue }, line: { color: C.blue } });
  addText(s, "Play", 5.1, 5.18, 0.55, 0.32, {
    fontFace: EN, fontSize: 10.5, bold: true, color: C.white, align: "center", valign: "mid",
    hyperlink: { url: preUrl },
  });
  addText(s, "Reset", 5.88, 5.18, 0.55, 0.32, { fontFace: EN, fontSize: 10, bold: true, align: "center" });
  addLine(s, 6.8, 5.33, 2.65, 0, "B8C4D0", 1.2);
  s.addShape(pptx.ShapeType.ellipse, { x: 7.58, y: 5.23, w: 0.18, h: 0.18, fill: { color: C.blue }, line: { color: C.blue } });
  ["Snap E₁", "Snap E₂", "Snap E₃"].forEach((t, i) => {
    addCard(s, 10.25 + i * 0.85, 5.12, 0.72, 0.42, { fill: C.orangeSoft, line: "F0B780" });
    addText(s, t, 10.31 + i * 0.85, 5.25, 0.6, 0.1, { fontFace: EN, fontSize: 7.8, color: C.orange, bold: true, align: "center" });
  });
  addText(s, "ψ(0)=0, ψ′(0)=1", 0.6, 5.83, 1.9, 0.16, { fontFace: MATH, fontSize: 8.5 });
  addEq(s, "ode_system", 5.85, 5.75, 2.35, 0.36, { fontSize: 10, box: false });
  addText(s, "1/2/3 跳转能级　P 播放　R 重置", 9.8, 5.82, 2.1, 0.16, { fontSize: 7.5, color: C.muted });
  s.addShape(pptx.ShapeType.roundRect, { x: 11.05, y: 6.08, w: 1.45, h: 0.38, fill: { color: C.ink }, line: { color: C.ink } });
  addText(s, "打开在线互动页 ↗", 11.15, 6.18, 1.25, 0.28, {
    fontSize: 8.5, bold: true, color: C.white, align: "center", valign: "mid",
    hyperlink: { url: preUrl },
  });
}

function slide07() {
  const s = makeSlide("METHOD COMPARISON · CROSS VALIDATION", "两种方法得到一致能级，但误差机制完全不同。", 7,
    "差分法一次求多个本征值；打靶法逐个找残差零点。两者误差机制不同但结果交叉验证。");
  addImage(s, "error-comparison.svg", 0.55, 1.35, 4.25, 3.15);
  addEq(s, "comparison_wave", 0.55, 4.92, 4.25, 0.58, { fontSize: 10.5 });
  const header = ["对比项", "差分法", "打靶法"].map((t) => ({ text: t, options: { bold: true, fill: { color: C.blueSoft } } }));
  const rows = [
    ["数学形式", "Hψ = Eψ", "F(E)=ψE(L)=0"],
    ["求解方式", "一次求多个本征值", "逐个扫描与求根"],
    ["主要误差", "O(Δx²)", "ODE 积分 + 根搜索容差"],
    ["物理图像", "相邻网格点耦合", "边界条件筛选能量"],
  ];
  addMiniTable(s, [header, ...rows], 5.35, 1.35, 7.0, 3.2, [1.2, 2.8, 3.0], { fontSize: 9.2 });
  addCard(s, 5.35, 5.05, 7.0, 0.55, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "同一个物理问题，用两种不同数值思路得到一致结果，就是对程序与结论的交叉验证。", 5.62, 5.23, 6.45, 0.14, { fontSize: 10.5, bold: true });
}

function slide08() {
  const s = makeSlide("FROM 1D TO CENTRAL POTENTIALS", "从一维边界筛选能量，走向三维对称性分解本征态。", 8,
    "过渡页：从一维势阱的边界筛选能量，转向三维中心势的分离变量与量子数。");
  addCard(s, 0.6, 1.55, 4.75, 2.2, { fill: C.panel, line: C.line, accent: C.blue });
  addText(s, "前半部分", 0.85, 1.83, 1.2, 0.16, { fontSize: 8, color: C.muted, bold: true });
  addText(s, "一维无限深势阱", 0.85, 2.1, 2.2, 0.25, { fontSize: 16, bold: true });
  addText(s, "V(x),  ψ(x)", 0.85, 2.52, 2.4, 0.24, { fontFace: MATH, fontSize: 17, align: "center" });
  addEq(s, "synthesis_fd", 1.25, 3.02, 3.3, 0.45, { fontSize: 15, fill: C.white });
  addText(s, "维度提升 → 球对称性", 5.62, 2.52, 2.0, 0.22, { fontSize: 13, color: C.blue, bold: true, align: "center" });
  addCard(s, 7.85, 1.55, 4.75, 2.2, { fill: "FFFAF5", line: C.line, accent: C.orange });
  addText(s, "后半部分", 8.1, 1.83, 1.2, 0.16, { fontSize: 8, color: C.muted, bold: true });
  addText(s, "三维中心势场", 8.1, 2.1, 2.2, 0.25, { fontSize: 16, bold: true });
  addText(s, "V(r),  ψ(r, θ, φ)", 8.1, 2.52, 2.6, 0.24, { fontFace: MATH, fontSize: 17, align: "center" });
  addEq(s, "separation_result", 8.22, 3.02, 3.95, 0.45, { fontSize: 13.5, fill: C.white });
  const steps = [["01", "分离变量"], ["02", "角向解析"], ["03", "径向解析"], ["04", "量子化"]];
  steps.forEach((st, i) => {
    addText(s, st[0], 1.25 + i * 2.75, 5.1, 0.32, 0.18, { fontFace: EN, color: C.blue, bold: true, fontSize: 9 });
    addText(s, st[1], 1.58 + i * 2.75, 5.08, 1.5, 0.2, { fontSize: 10.5, bold: true });
    if (i < 3) addText(s, "→", 3.52 + i * 2.75, 5.08, 0.3, 0.2, { color: C.blue, bold: true, fontSize: 14 });
  });
}

function slide09() {
  const s = makeSlide("CENTRAL POTENTIAL · SEPARATION", "中心势只依赖 r，因此球坐标把三维方程拆成两个问题。", 9,
    "球坐标中拉普拉斯算符的角向部分可以写成角动量算符，分离常数成为 l(l+1)ℏ²。");
  addSectionLabel(s, "三维定态薛定谔方程", 0.55, 1.22);
  addEq(s, "schrodinger_3d", 0.55, 1.48, 5.4, 0.72, { fontSize: 10.8 });
  addSectionLabel(s, "分离变量假设", 0.55, 2.62);
  addEq(s, "separation_ansatz", 0.55, 2.88, 5.4, 0.5, { fontSize: 14 });
  addText(s, "这里不是近似：只要势能严格球对称，径向变量与角变量就可以分离。", 0.65, 3.72, 4.9, 0.32, { fontSize: 10, color: C.muted });
  addSectionLabel(s, "关键算符分解", 6.45, 1.22);
  addEq(s, "laplacian_split", 6.45, 1.48, 5.65, 0.72, { fontSize: 10 });
  addCard(s, 6.45, 2.62, 2.65, 1.25, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "径向算符", 6.65, 2.88, 1.1, 0.17, { color: C.blue, bold: true, fontSize: 10 });
  addText(s, "决定离核距离与径向节点", 6.65, 3.22, 1.85, 0.25, { color: C.muted, fontSize: 9 });
  addCard(s, 9.45, 2.62, 2.65, 1.25, { fill: C.orangeSoft, line: "F0C69C" });
  addText(s, "角动量算符", 9.65, 2.88, 1.3, 0.17, { color: C.orange, bold: true, fontSize: 10 });
  addEq(s, "l2_eigen", 9.65, 3.13, 2.1, 0.35, { fontSize: 10.5, box: false });
  addCard(s, 6.45, 4.45, 5.65, 0.55, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "同一个分离常数同时进入角向方程和径向有效势，把两部分连接起来。", 6.7, 4.64, 5.1, 0.12, { fontSize: 10.5, bold: true });
}

function slide10() {
  const s = makeSlide("AZIMUTHAL EQUATION · MAGNETIC QUANTUM NUMBER", "φ 方向的周期边界条件，首先把 m 限制为整数。", 10,
    "方位角解是复指数。绕 z 轴一周波函数必须单值，因此 m 只能取整数。");
  addSectionLabel(s, "方位角方程", 0.55, 1.22);
  addEq(s, "phi_eq", 0.55, 1.48, 4.1, 0.55, { fontSize: 14 });
  addEq(s, "phi_solution", 0.55, 2.25, 4.1, 0.55, { fontSize: 14 });
  addCard(s, 0.55, 3.2, 4.1, 1.0, { fill: C.orangeSoft, line: "F0C69C" });
  addText(s, "波函数必须单值", 0.75, 3.48, 1.35, 0.16, { color: C.orange, fontSize: 9, bold: true });
  addEq(s, "periodicity", 1.02, 3.73, 3.25, 0.32, { box: false, fontSize: 11.5 });
  addCard(s, 5.65, 1.35, 2.55, 2.55, { fill: C.panel, line: C.line });
  s.addShape(pptx.ShapeType.ellipse, { x: 6.15, y: 1.65, w: 1.55, h: 1.55, fill: { color: C.white, transparency: 100 }, line: { color: "C9D3DF" } });
  addLine(s, 6.25, 2.43, 1.35, 0, "C9D3DF");
  addLine(s, 6.93, 1.77, 0, 1.35, "C9D3DF");
  addText(s, "e^{imφ}", 6.38, 2.05, 0.95, 0.2, { fontFace: MATH, color: C.blue, fontSize: 16, align: "center" });
  addText(s, "相位绕单位圆旋转", 6.08, 3.45, 1.75, 0.16, { color: C.muted, fontSize: 8, align: "center" });
  addEq(s, "lz_eigen", 8.9, 1.48, 3.35, 0.5, { fontSize: 12 });
  addCard(s, 8.9, 2.35, 3.35, 1.28, { fill: C.panel, line: C.line });
  addText(s, "m", 9.18, 2.63, 0.35, 0.2, { fontFace: MATH, fontSize: 20, color: C.blue, bold: true });
  addText(s, "相位绕 z 轴变化的圈数与方向；单独复基底的概率密度轴对称。", 9.62, 2.63, 2.2, 0.45, { fontSize: 9.5 });
  addCard(s, 0.55, 5.15, 11.7, 0.42, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "量子数 m 不是人为编号，而是周期边界条件产生。", 0.78, 5.3, 11.2, 0.1, { fontSize: 10.5, bold: true });
}

function slide11() {
  const s = makeSlide("POLAR EQUATION · ASSOCIATED LEGENDRE", "θ 方程的极点正则性，产生关联勒让德多项式。", 11,
    "极角方程在两个极点处不能发散，正则性筛选出关联勒让德多项式。");
  addSectionLabel(s, "极角微分方程", 0.55, 1.18);
  addEq(s, "theta_eq", 0.55, 1.43, 5.45, 0.78, { fontSize: 9.5 });
  addSectionLabel(s, "变量代换 x = cosθ", 0.55, 2.55);
  addEq(s, "legendre_eq", 0.55, 2.8, 5.45, 0.62, { fontSize: 10.5 });
  addCard(s, 0.55, 3.85, 5.45, 0.92, { fill: C.orangeSoft, line: "F0C69C" });
  addText(s, "为什么不是任意解？", 0.78, 4.08, 1.7, 0.16, { color: C.orange, bold: true, fontSize: 9.5 });
  addText(s, "在 θ=0,π 两个极点处，角向波函数必须保持有限。", 0.78, 4.35, 3.75, 0.16, { fontSize: 9 });
  addEq(s, "legendre_reg", 3.52, 4.16, 2.15, 0.38, { box: false, fontSize: 10.5 });
  addImage(s, "legendre-family.svg", 6.45, 1.35, 5.75, 3.4);
  addText(s, "l 控制角向节点总数；|m| 控制极点附近的零点阶数。", 6.6, 5.12, 5.4, 0.2, { fontSize: 10, color: C.muted });
}

function slide12() {
  const s = makeSlide("SPHERICAL HARMONICS · ANGULAR STRUCTURE", "球谐函数把勒让德角向形状与方位相位组合起来。", 12,
    "球谐函数由关联勒让德函数和方位相位组成；对任意中心势角向解都相同。");
  addEq(s, "spherical_harmonics", 0.55, 1.35, 5.9, 0.58, { fontSize: 12 });
  addEq(s, "spherical_negative", 0.55, 2.05, 5.9, 0.46, { fontSize: 10.5, fill: C.white });
  addMiniTable(s, [
    ["P_l^m(cosθ)", "控制极角方向的节点与形状"],
    ["e^{imφ}", "控制绕 z 轴的复相位变化"],
    ["N_lm", "归一化常数，保证 ∫|Y_l^m|² dΩ = 1"],
  ], 0.55, 2.9, 5.9, 1.06, [2.0, 3.9], { fontSize: 8.6 });
  addEq(s, "quantum_range", 1.25, 4.27, 4.2, 0.42, { box: false, fontSize: 13.5 });
  addCard(s, 0.55, 5.18, 5.9, 0.42, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "对任意中心势，角向解都相同；势能的具体形式只会改变径向函数和能量。", 0.75, 5.33, 5.55, 0.1, { fontSize: 9.3, bold: true });
  [["orbitals/2pz.png", "l=1, m=0", "一个角向节点：xy 平面"], ["orbitals/3dz2.png", "l=2, m=0", "两个角向节点：圆锥面"]].forEach((it, i) => {
    addImage(s, it[0], 7.1 + i * 2.7, 1.28, 2.35, 3.85, { fit: "cover" });
    addText(s, it[1], 7.22 + i * 2.7, 4.65, 1.0, 0.15, { fontFace: MATH, color: C.white, fontSize: 9.2 });
    addText(s, it[2], 7.22 + i * 2.7, 4.92, 1.8, 0.15, { color: "BFD0E2", fontSize: 7.6 });
  });
  addText(s, "图像来自现有 Three.js 项目真实采样；这里展示的是 |ψ|²，不是经典轨迹。", 7.6, 5.38, 4.2, 0.16, { color: C.muted, fontSize: 8, align: "center" });
}

function slide13() {
  const s = makeSlide("RADIAL EQUATION · EFFECTIVE POTENTIAL", "令 u=rR 后，三维径向问题重新变成一维本征值方程。", 13,
    "u=rR 的代换消掉一阶导数，径向方程与一维薛定谔方程同形。");
  addSectionLabel(s, "原始径向方程", 0.55, 1.2);
  addEq(s, "radial_original", 0.55, 1.45, 5.4, 0.8, { fontSize: 8.8 });
  addEq(s, "u_sub", 0.55, 2.65, 1.6, 0.42, { fontSize: 13.2 });
  addText(s, "→", 2.35, 2.75, 0.3, 0.15, { color: C.blue, bold: true, fontSize: 14 });
  addEq(s, "radial_u", 2.85, 2.55, 3.1, 0.65, { fontSize: 9.5 });
  addSectionLabel(s, "有效势", 0.55, 3.6, 1.0, C.orange);
  addEq(s, "veff", 0.55, 3.85, 5.4, 0.58, { fontSize: 10.8, fill: C.orangeSoft, line: "F0C69C" });
  addText(s, "前半部分的差分法和打靶法仍然适用，只是定义域变成 r≥0。", 0.65, 4.75, 5.0, 0.2, { fontSize: 9.5, color: C.muted });
  addImage(s, "effective-potential.svg", 6.45, 1.35, 5.75, 3.8);
  addCard(s, 6.45, 5.45, 5.75, 0.45, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "l>0 时，1/r² 势垒抑制波函数靠近原点；角动量会直接改变径向分布。", 6.7, 5.6, 5.25, 0.1, { fontSize: 9.4, bold: true });
}

function slide14() {
  const s = makeSlide("COULOMB POTENTIAL · ASYMPTOTIC STRUCTURE", "先处理原点与无穷远，剩下的部分才由拉盖尔多项式描述。", 14,
    "先提取无穷远指数衰减和原点正则幂次，剩余函数满足拉盖尔方程。");
  addSectionLabel(s, "氢原子库仑势", 0.55, 1.2);
  addEq(s, "coulomb", 0.55, 1.47, 5.25, 0.58, { fontSize: 11.2 });
  addEq(s, "radial_factor", 0.55, 2.35, 5.25, 0.55, { fontSize: 13 });
  addText(s, "这个分解不是猜最终答案，而是先提取微分方程在两个极限处必须满足的行为。", 0.68, 3.25, 4.7, 0.28, { fontSize: 9.5, color: C.muted });
  const cards = [
    ["01", "e^{-ρ/2}", "无穷远衰减", "束缚态在 r→∞ 时必须趋于零并可归一化。"],
    ["02", "ρ^l", "原点正则", "抵消离心项要求的近原点行为。"],
    ["03", "v(ρ)", "节点结构", "决定有限半径内的振荡与径向节点。"],
  ];
  cards.forEach((c, i) => {
    addCard(s, 6.15 + i * 2.08, 1.48, 1.78, 2.3, { fill: i === 0 ? C.blueSoft : (i === 1 ? C.panel : C.greenSoft), line: C.line });
    addText(s, c[0], 6.35 + i * 2.08, 1.78, 0.4, 0.15, { fontFace: EN, color: C.blue, bold: true, fontSize: 8 });
    addText(s, c[1], 6.3 + i * 2.08, 2.18, 1.35, 0.22, { fontFace: MATH, fontSize: 16, align: "center" });
    addText(s, c[2], 6.35 + i * 2.08, 2.78, 1.3, 0.16, { fontSize: 10, bold: true, align: "center" });
    addText(s, c[3], 6.35 + i * 2.08, 3.18, 1.25, 0.35, { fontSize: 8.2, color: C.muted, align: "center" });
  });
  addCard(s, 0.55, 5.28, 11.7, 0.42, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "先由物理边界条件固定指数因子与幂次因子，再求剩余函数，这是径向解析解的核心策略。", 0.78, 5.43, 11.15, 0.1, { fontSize: 10.3, bold: true });
}

function slide15() {
  const s = makeSlide("RADIAL QUANTIZATION · ASSOCIATED LAGUERRE", "级数必须终止为拉盖尔多项式，归一化条件由此量子化能量。", 15,
    "剩余幂级数必须终止，否则会抵消指数衰减导致波函数在无穷远发散。");
  addSectionLabel(s, "剩余函数满足关联拉盖尔方程", 0.55, 1.2);
  addEq(s, "laguerre_eq", 0.55, 1.47, 4.85, 0.55, { fontSize: 12.5 });
  addCard(s, 0.55, 2.32, 4.85, 0.82, { fill: C.orangeSoft, line: "F0C69C" });
  addText(s, "如果级数不终止", 0.78, 2.55, 1.55, 0.15, { color: C.orange, bold: true, fontSize: 9.2 });
  addText(s, "v(ρ) 的高阶项会抵消 e^{-ρ/2}，使波函数在无穷远发散。", 0.78, 2.86, 4.1, 0.16, { fontSize: 8.8 });
  addText(s, "n−l−1 = 0,1,2,…", 0.75, 3.63, 1.65, 0.15, { fontFace: MATH, fontSize: 10 });
  addText(s, "→", 2.55, 3.58, 0.3, 0.18, { color: C.blue, bold: true, fontSize: 14 });
  addEq(s, "laguerre_solution", 2.98, 3.48, 2.15, 0.36, { fontSize: 10.5, box: false });
  addCard(s, 0.55, 4.2, 4.85, 0.42, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "径向节点数", 0.78, 4.35, 1.0, 0.1, { color: C.muted, fontSize: 8.5, bold: true });
  addEq(s, "node_count", 2.75, 4.23, 2.0, 0.32, { box: false, fontSize: 13 });
  addImage(s, "radial-probability.svg", 5.95, 1.25, 6.25, 4.2);
  addCard(s, 6.1, 5.75, 5.85, 0.45, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "拉盖尔多项式既保证级数终止，也直接决定径向节点数。", 6.35, 5.9, 5.35, 0.1, { fontSize: 9.4, bold: true });
}

function slide16() {
  const s = makeSlide("HYDROGEN EIGENSTATE · COMPLETE STRUCTURE", "完整氢原子波函数：角向由勒让德控制，径向由拉盖尔控制。", 16,
    "完整结构由指数衰减、原点正则、拉盖尔径向节点和球谐角向结构共同组成。");
  addEq(s, "full_wavefunction", 0.55, 1.18, 11.75, 0.65, { fontSize: 9.8 });
  const strips = [["主量子数 n", "能量、尺度、总节点数"], ["角量子数 l", "角动量与角向节点"], ["磁量子数 m", "Lz 本征值与复球谐基底"]];
  strips.forEach((st, i) => {
    addCard(s, 0.55 + i * 4.05, 2.05, 3.55, 0.48, { fill: C.panel, line: C.line });
    addText(s, st[0], 0.72 + i * 4.05, 2.18, 1.3, 0.12, { color: C.blue, bold: true, fontSize: 8.4 });
    addText(s, st[1], 0.72 + i * 4.05, 2.38, 2.2, 0.1, { color: C.muted, fontSize: 7.3 });
  });
  const imgs = [
    ["orbitals/1s.png", "1s", "Nr=0, NΩ=0"],
    ["orbitals/2pz.png", "2pz", "Nr=0, NΩ=1"],
    ["orbitals/3pz.png", "3pz", "Nr=1, NΩ=1"],
    ["orbitals/3dz2.png", "3dz2", "Nr=0, NΩ=2"],
  ];
  imgs.forEach((im, i) => {
    addImage(s, im[0], 0.55 + i * 3.05, 2.85, 2.6, 2.45, { fit: "cover" });
    addText(s, im[1], 0.7 + i * 3.05, 4.95, 0.55, 0.15, { color: C.white, bold: true, fontFace: EN, fontSize: 10 });
    addText(s, im[2], 0.7 + i * 3.05, 5.18, 1.35, 0.12, { color: "A9BED4", fontSize: 7.5 });
  });
}

function slide17() {
  const s = makeSlide("ENERGY LEVELS · QUANTUM NUMBERS", "库仑势能量只依赖 n，而 l,m 决定同一能级内的态结构。", 17,
    "理想库仑势具有额外对称性，能量只依赖 n，不显含 l 和 m。");
  addImage(s, "hydrogen-energy.svg", 0.65, 1.45, 4.35, 2.55);
  addEq(s, "energy_hydrogen", 0.65, 4.65, 4.35, 0.56, { fontSize: 9.2 });
  [["n", "主量子数", "1,2,3,…", C.blue], ["l", "角量子数", "0,…,n−1", C.orange], ["m", "磁量子数", "−l,…,l", C.green]].forEach((q, i) => {
    addCard(s, 5.5 + i * 2.35, 1.28, 1.95, 1.55, { fill: C.panel, line: C.line, accent: q[3] });
    addText(s, q[0], 5.7 + i * 2.35, 1.55, 0.4, 0.22, { fontFace: EN, fontSize: 22, bold: true, color: q[3] });
    addText(s, q[1], 5.72 + i * 2.35, 2.04, 1.0, 0.16, { bold: true, fontSize: 9.5 });
    addText(s, q[2], 5.72 + i * 2.35, 2.38, 1.2, 0.16, { fontFace: MATH, fontSize: 10.5 });
  });
  addCard(s, 5.5, 3.22, 6.65, 0.75, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "忽略自旋时，第 n 层空间简并度", 5.72, 3.5, 2.2, 0.12, { fontSize: 9.2, bold: true });
  addEq(s, "degeneracy", 8.3, 3.38, 3.2, 0.35, { box: false, fontSize: 12.5 });
  addCard(s, 5.5, 4.35, 6.65, 0.6, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "加入外场、精细结构后，理想库仑简并会被打破。", 5.72, 4.56, 6.2, 0.12, { fontSize: 10, bold: true });
}

function slide18() {
  const s = makeSlide("FINAL SYNTHESIS · TWO ROUTES TO QUANTIZATION", "量子化不是“直接套公式”，而是允许解必须满足全部物理约束。", 18,
    `最后把数值量子化与解析量子化统一起来。氢原子互动项目：${projectUrl}`);
  addCard(s, 0.6, 1.35, 5.65, 2.85, { fill: C.panel, line: C.line, accent: C.blue });
  addText(s, "一维无限深势阱", 0.85, 1.75, 1.6, 0.16, { color: C.blue, bold: true, fontSize: 9 });
  addEq(s, "synthesis_fd", 1.85, 2.18, 3.1, 0.45, { fontSize: 15, fill: C.white });
  addBullets(s, ["左端给定初值，从 0 积分到 L", "只有少数 E 同时满足右端边界", "数值上表现为残差函数的离散零点"], 0.9, 2.95, 4.8, 0.7, { fontSize: 9.2, paraSpaceAfterPt: 2 });
  addText(s, "边界条件筛选能量", 0.85, 3.9, 2.0, 0.16, { bold: true, fontSize: 10.5 });
  addCard(s, 6.75, 1.35, 5.65, 2.85, { fill: "FFFAF5", line: C.line, accent: C.orange });
  addText(s, "三维库仑中心势", 7.0, 1.75, 1.7, 0.16, { color: C.orange, bold: true, fontSize: 9 });
  addEq(s, "synthesis_h", 8.0, 2.18, 3.1, 0.45, { fontSize: 15, fill: C.white });
  addBullets(s, ["角向极点正则性产生 l,m", "径向原点有限、无穷远可归一化", "级数终止为拉盖尔多项式，产生 n"], 7.05, 2.95, 4.8, 0.7, { fontSize: 9.2, paraSpaceAfterPt: 2 });
  addText(s, "正则性与归一化筛选本征态", 7.0, 3.9, 2.4, 0.16, { bold: true, fontSize: 10.5 });
  const flow = ["微分方程", "边界 / 正则 / 归一化", "离散量子数", "允许能量与本征函数"];
  flow.forEach((t, i) => {
    addCard(s, 0.6 + i * 3.1, 4.55, 2.2, 0.42, { fill: C.white, line: C.line });
    addText(s, t, 0.6 + i * 3.1, 4.69, 2.2, 0.1, { fontSize: 9.3, bold: true, align: "center" });
    if (i < 3) addText(s, "→", 2.95 + i * 3.1, 4.67, 0.25, 0.12, { color: C.blue, bold: true, fontSize: 14, align: "center" });
  });
  addCard(s, 0.6, 5.55, 11.8, 0.68, { fill: C.greenSoft, line: "C7E0CD" });
  addText(s, "从解析式到可视化", 0.85, 5.78, 1.6, 0.12, { fontSize: 10, bold: true });
  addText(s, "现有 Three.js 项目用 Rnl 与 Ylm 对 |ψ|² 采样，生成可旋转电子云。", 2.55, 5.78, 5.7, 0.12, { fontSize: 9.2, color: C.muted });
  s.addShape(pptx.ShapeType.roundRect, { x: 10.45, y: 5.65, w: 1.85, h: 0.38, fill: { color: C.ink }, line: { color: C.ink } });
  addText(s, "打开氢原子互动项目 ↗", 10.55, 5.73, 1.55, 0.25, {
    fontSize: 8.5, bold: true, color: C.white, align: "center", valign: "mid", hyperlink: { url: projectUrl },
  });
}

function slide19() {
  const s = makeSlide("FINAL CHECK · ANALYTICAL BASELINE", "解析解不是数值计算的输入，而是最后验算的真实基准。", 19,
    "解析路线给出真值基准；数值路线独立求本征值，最后才用解析结果验算误差。");
  addCard(s, 0.6, 1.32, 5.65, 3.35, { fill: C.panel, line: C.line, accent: C.blue });
  addText(s, "解析路线", 0.88, 1.68, 1.05, 0.16, { color: C.blue, bold: true, fontSize: 9.2 });
  [["边界 / 正则 / 归一化"], ["量子数 n,l,m"], ["闭式能级"]].forEach((item, i) => {
    addCard(s, 0.9 + i * 1.68, 2.12, 1.25, 0.68, { fill: C.white, line: C.line });
    addText(s, item[0], 0.98 + i * 1.68, 2.33, 1.08, 0.16, { fontSize: 8.5, bold: true, align: "center" });
    if (i < 2) addText(s, "→", 2.25 + i * 1.68, 2.36, 0.25, 0.15, { color: C.blue, bold: true, fontSize: 14, align: "center" });
  });
  addEq(s, "baseline_analytical", 0.9, 3.15, 4.85, 0.55, { fontSize: 10.5, fill: C.white });
  addText(s, "解析推导回答“真实本征值应该是多少”，为误差分析提供标尺。", 0.92, 4.08, 4.72, 0.2, { fontSize: 9.6, color: C.muted });

  addCard(s, 6.75, 1.32, 5.65, 3.35, { fill: "FFFAF5", line: C.line, accent: C.orange });
  addText(s, "数值路线", 7.03, 1.68, 1.05, 0.16, { color: C.orange, bold: true, fontSize: 9.2 });
  [["离散矩阵 / 残差"], ["线性代数 / 求根"], ["数值能级"]].forEach((item, i) => {
    addCard(s, 7.05 + i * 1.68, 2.12, 1.25, 0.68, { fill: C.white, line: C.line });
    addText(s, item[0], 7.13 + i * 1.68, 2.33, 1.08, 0.16, { fontSize: 8.5, bold: true, align: "center" });
    if (i < 2) addText(s, "→", 8.4 + i * 1.68, 2.36, 0.25, 0.15, { color: C.orange, bold: true, fontSize: 14, align: "center" });
  });
  addEq(s, "baseline_numerical", 7.05, 3.15, 4.85, 0.55, { fontSize: 10.5, fill: C.white });
  addText(s, "程序只看离散算符或边界残差，不需要提前知道闭式能级。", 7.08, 4.08, 4.72, 0.2, { fontSize: 9.6, color: C.muted });

  addCard(s, 0.6, 5.42, 11.8, 0.72, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "差分法和打靶法计算时不代入 Eₙ=n²π²/(2L²)；解析公式只用于计算完成后的误差验算。", 0.9, 5.68, 11.2, 0.14, { fontSize: 12, bold: true });
}

function slide20() {
  const s = makeSlide("ERROR SOURCES · CLASSIFICATION", "误差来源要先分类，才能判断哪一项真正主导结果。", 20,
    "按差分法、打靶法、有限区间截断和舍入误差分类；本题无限深势阱差分法主误差是离散误差。");
  const cards = [
    ["差分法", "dx_order", "二阶导数用中心差分近似，主误差来自泰勒展开中被截断的 Δx² 项。", C.blue, C.blueSoft],
    ["打靶法", "shooting_error_terms", "误差来自积分步长、积分器阶数、根搜索容差和边界残差停止标准。", C.orange, C.orangeSoft],
    ["有限区间截断", "finite_truncation", "谐振子和径向问题把无穷远截成有限区间；截断太近会改变尾部边界。", C.green, C.greenSoft],
    ["舍入误差", "floating_roundoff", "浮点计算始终存在，但本题能量误差主要不是由舍入误差控制。", C.muted, C.panel],
  ];
  cards.forEach((card, i) => {
    const x = 0.6 + i * 3.02;
    addCard(s, x, 1.38, 2.62, 3.55, { fill: card[4], line: C.line, accent: card[3] });
    addText(s, card[0], x + 0.2, 1.75, 1.6, 0.18, { color: card[3], fontSize: 11.5, bold: true });
    addEq(s, card[1], x + 0.22, 2.18, 2.18, 0.66, { fontSize: i === 1 ? 8.5 : 9.6, fill: C.white });
    addText(s, card[2], x + 0.22, 3.32, 2.16, 0.72, { fontSize: 8.4, color: C.ink, fit: "shrink" });
  });
  addCard(s, 0.6, 5.48, 11.8, 0.58, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "对无限深势阱的差分矩阵，边界是精确给定的，主导误差就是二阶导数离散误差。", 0.88, 5.68, 11.2, 0.14, { fontSize: 11.2, bold: true });
}

function slide21() {
  const s = makeSlide("CONVERGENCE TEST · DISCRETIZATION ERROR", "收敛数据验证了：误差确实按二阶离散误差下降。", 21,
    "使用 convergence.csv 中 N=25,50,100,200,400 的结果验证二阶收敛和高能级误差放大。");
  addSectionLabel(s, "N=25,50,100,200,400 的双对数图", 0.6, 1.22);
  addImage(s, "convergence.svg", 0.6, 1.52, 5.85, 3.25);
  addSectionLabel(s, "相邻网格误差比：error(next N) / error(N)", 6.9, 1.22, 4.2);
  const header = ["区间", "n=1", "n=5"].map((t) => ({ text: t, options: { bold: true, fill: { color: C.blueSoft } } }));
  const rows = [
    ["25 → 50", "0.260", "0.262"],
    ["50 → 100", "0.255", "0.256"],
    ["100 → 200", "0.253", "0.253"],
    ["200 → 400", "0.251", "0.251"],
  ];
  addMiniTable(s, [header, ...rows], 6.9, 1.55, 5.15, 2.18, [1.65, 1.75, 1.75], { fontSize: 10.2 });
  addCard(s, 6.9, 4.02, 5.15, 0.52, { fill: C.orangeSoft, line: "F0C69C" });
  addText(s, "N 约加倍  →  Δx 约减半  →  误差约降为 1/4", 7.18, 4.21, 4.6, 0.12, { fontSize: 10.6, bold: true, color: C.ink });
  addCard(s, 6.9, 4.9, 2.45, 0.78, { fill: C.panel, line: C.line });
  addText(s, "网格近似加倍后，误差约变成原来的 1/4。", 7.12, 5.13, 2.02, 0.22, { fontSize: 9.2, bold: true });
  addCard(s, 9.6, 4.9, 2.45, 0.78, { fill: C.panel, line: C.line });
  addText(s, "同一网格下，n=5 的误差始终大于 n=1。", 9.82, 5.13, 2.02, 0.22, { fontSize: 9.2, bold: true });
  addCard(s, 0.6, 5.85, 11.45, 0.42, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "这不是猜测：数值结果同时验证了二阶收敛和高能级误差放大。", 0.86, 5.99, 10.9, 0.1, { fontSize: 10.5, bold: true });
}

function slide22() {
  const s = makeSlide("METHOD SCALE · NUMERICAL ERROR COMPARISON", "不同数值方法精度量级不同，适用场景也不同。", 22,
    "用 energy_comparison.csv 对比无限深势阱与谐振子的差分法、打靶法误差量级。");
  addSectionLabel(s, "来自 energy_comparison.csv 的误差量级", 0.6, 1.22);
  addImage(s, "method-error-scale.svg", 0.6, 1.5, 5.95, 3.85);
  addText(s, "纵轴为对数坐标；势阱打靶法柱使用绝对误差，其他柱使用相对误差百分比。", 0.82, 5.5, 5.55, 0.15, { fontSize: 8.4, color: C.muted });
  const summary = [
    ["无限深势阱 · 差分法", "相对误差约 10⁻⁴~10⁻³ 量级，随能级升高放大。", C.blue, C.blueSoft],
    ["无限深势阱 · 打靶法", "前三个能级绝对误差约 10⁻¹¹，由积分与求根精度控制。", C.orange, C.orangeSoft],
    ["谐振子基态", "差分法约 0.0613%；打靶法约 1.55×10⁻⁸%。", C.green, C.greenSoft],
  ];
  summary.forEach((row, i) => {
    addCard(s, 7.05, 1.42 + i * 1.02, 4.95, 0.74, { fill: row[3], line: C.line, accent: row[2] });
    addText(s, row[0], 7.28, 1.62 + i * 1.02, 2.2, 0.14, { fontSize: 9.8, bold: true, color: row[2] });
    addText(s, row[1], 7.28, 1.88 + i * 1.02, 4.42, 0.16, { fontSize: 8.7, color: C.ink });
  });
  addCard(s, 7.05, 4.68, 4.95, 0.5, { fill: C.white, line: C.line });
  addText(s, "0.0613%  vs.  1.55×10⁻⁸%", 7.25, 4.86, 4.55, 0.12, { fontFace: EN, fontSize: 15.5, color: C.ink, align: "center", bold: true });
  addCard(s, 7.05, 5.55, 4.95, 0.72, { fill: C.blueSoft, line: "C7DDF6" });
  addText(s, "差分法适合一次求多个本征值，但精度由网格控制；打靶法精度可很高，但通常需要逐个能级搜索。解析解提供误差评估基准。", 7.28, 5.78, 4.5, 0.22, { fontSize: 8.8, bold: true });
}

[
  slide01, slide02, slide03, slide04, slide05, slide06, slide07, slide08, slide09,
  slide10, slide11, slide12, slide13, slide14, slide15, slide16, slide17, slide18,
  slide19, slide20, slide21, slide22,
].forEach((fn) => fn());

await pptx.writeFile({ fileName: output });

const injected = spawnSync("python3", [injectScript, output], {
  cwd: root,
  stdio: "inherit",
});
if (injected.status !== 0) {
  throw new Error(`Equation injection failed with exit code ${injected.status}`);
}

console.log(output);
