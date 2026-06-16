import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const bundledNodeModules = "/Users/qi-heng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const { chromium } = require(path.join(bundledNodeModules, "playwright"));
const pptxgen = require(path.join(bundledNodeModules, "pptxgenjs"));

const rootDir = path.resolve(import.meta.dirname, "../../..");
const outputDir = path.join(rootDir, "outputs");
const imageDir = path.join(outputDir, "web-pre-pptx-pages");
const outputFile = path.join(outputDir, "quantum-numerical-central-potential.pptx");
const previewUrl = process.env.PREVIEW_URL ?? "http://127.0.0.1:4174/";
const projectUrl = "https://hengqi61-maker.github.io/hydrogen-orbital/";
const interactivePreUrl = `${projectUrl}pre/#/5`;

await fs.mkdir(imageDir, { recursive: true });

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath,
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.goto(previewUrl, { waitUntil: "networkidle" });
await page.addStyleTag({
  content: `
    .reveal .controls,
    .reveal .progress,
    .reveal .slide-number {
      display: none !important;
    }
  `,
});

const slideCount = await page.locator(".slides > section").count();
const notes = [];

for (let index = 0; index < slideCount; index += 1) {
  await page.evaluate((slideIndex) => {
    window.location.hash = `#/${slideIndex}`;
  }, index);
  await page.waitForTimeout(index === 5 ? 450 : 160);

  const currentSlide = page.locator(".slides > section").nth(index);
  const note = await currentSlide.locator("aside.notes").textContent().catch(() => "");
  notes.push(note?.trim() ?? "");

  const imagePath = path.join(
    imageDir,
    `slide-${String(index + 1).padStart(2, "0")}.png`,
  );
  await page.screenshot({ path: imagePath, fullPage: false });
}

await browser.close();

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Qi-Heng";
pptx.subject = "量子本征值问题：数值方法与中心势解析结构";
pptx.title = "量子本征值问题：数值方法与中心势解析结构";
pptx.company = "Computational Physics";
pptx.lang = "zh-CN";
pptx.theme = {
  headFontFace: "PingFang SC",
  bodyFontFace: "PingFang SC",
  lang: "zh-CN",
};
pptx.defineSlideMaster({
  title: "FULL_PAGE",
  background: { color: "FFFFFF" },
  objects: [],
  slideNumber: {
    x: 12.65,
    y: 7.14,
    w: 0.35,
    h: 0.15,
    fontFace: "Helvetica Neue",
    fontSize: 7.5,
    color: "8291A3",
    align: "right",
    margin: 0,
  },
});

for (let index = 0; index < slideCount; index += 1) {
  const slide = pptx.addSlide("FULL_PAGE");
  const imagePath = path.join(
    imageDir,
    `slide-${String(index + 1).padStart(2, "0")}.png`,
  );

  slide.addImage({
    path: imagePath,
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    altText: `量子力学汇报第 ${index + 1} 页`,
  });

  if (index === 5) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 4.67,
      y: 5.12,
      w: 0.53,
      h: 0.38,
      fill: { color: "FFFFFF", transparency: 100 },
      line: { color: "FFFFFF", transparency: 100 },
      hyperlink: { url: interactivePreUrl },
    });
  }

  if (index === 17) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 10.87,
      y: 5.52,
      w: 1.65,
      h: 0.42,
      fill: { color: "FFFFFF", transparency: 100 },
      line: { color: "FFFFFF", transparency: 100 },
      hyperlink: { url: projectUrl },
    });
  }

  const noteParts = [
    notes[index],
    index === 5
      ? `点击 Play 打开互动网页：${interactivePreUrl}\n操作：1/2/3 跳到前三个本征值；A/D 微调能量；Shift+A/D 大步调整；P 播放；R 重置。`
      : "",
    index === 17 ? `氢原子互动项目：${projectUrl}` : "",
  ].filter(Boolean);
  slide.addNotes(noteParts.join("\n\n"));
}

await pptx.writeFile({ fileName: outputFile });
console.log(`Created ${outputFile} with ${slideCount} slides.`);
