import Reveal from "reveal.js";
import RevealNotes from "reveal.js/plugin/notes";
import RevealMath from "reveal.js/plugin/math";
import "reveal.js/reveal.css";
import "./styles.css";
import { ShootingDemo } from "./interactive/ShootingDemo.js";

const mobileMedia = window.matchMedia("(max-width: 700px)");
const requestedSlideIndex = Number.parseInt(
  window.location.hash.match(/^#\/(\d+)/)?.[1] ?? "",
  10,
);

function currentDeckSize() {
  if (!mobileMedia.matches) return { width: 1280, height: 720 };
  return {
    width: Math.max(window.innerWidth, 320),
    height: Math.max(window.visualViewport?.height ?? window.innerHeight, 480),
  };
}

const initialSize = currentDeckSize();

const deck = new Reveal({
  width: initialSize.width,
  height: initialSize.height,
  margin: 0,
  minScale: 1,
  maxScale: 2,
  center: false,
  controls: true,
  controlsLayout: "bottom-right",
  controlsTutorial: false,
  progress: true,
  slideNumber: "c/t",
  hash: true,
  history: true,
  transition: "none",
  backgroundTransition: "none",
  disableLayout: mobileMedia.matches,
  touch: !mobileMedia.matches,
  plugins: [RevealNotes, RevealMath.KaTeX],
  katex: {
    local: "./vendor/katex",
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false },
    ],
  },
});

const demo = new ShootingDemo(document.querySelector("#shooting-demo"));

function syncResponsiveLayout() {
  const size = currentDeckSize();
  document.documentElement.dataset.mobile = String(mobileMedia.matches);
  deck.configure({
    width: size.width,
    height: size.height,
    disableLayout: mobileMedia.matches,
    touch: !mobileMedia.matches,
  });
  if (!mobileMedia.matches) deck.layout();
  demo.resize();
}

function syncDemoState(slide = deck.getCurrentSlide()) {
  demo.setActive(slide?.dataset.slide === "interactive");
}

deck.on("ready", ({ currentSlide }) => {
  syncResponsiveLayout();
  syncDemoState(deck.getCurrentSlide() ?? currentSlide);
  requestAnimationFrame(() => {
    if (Number.isInteger(requestedSlideIndex) && requestedSlideIndex >= 0) {
      deck.slide(requestedSlideIndex);
    }
    syncResponsiveLayout();
    syncDemoState();
    window.scrollTo(0, 0);
  });
});
deck.on("slidechanged", ({ currentSlide }) => {
  syncDemoState(currentSlide);
  if (mobileMedia.matches) window.scrollTo(0, 0);
});

let resizeFrame = 0;
function scheduleResponsiveLayout() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(syncResponsiveLayout);
}

window.addEventListener("resize", scheduleResponsiveLayout);
window.visualViewport?.addEventListener("resize", scheduleResponsiveLayout);
mobileMedia.addEventListener("change", () => window.location.reload());

window.addEventListener("keydown", async (event) => {
  if (event.key.toLowerCase() !== "f" || event.metaKey || event.ctrlKey || event.altKey) return;
  if (deck.getCurrentSlide()?.dataset.slide === "interactive" && event.target instanceof HTMLInputElement) return;
  event.preventDefault();
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
});

deck.initialize();
