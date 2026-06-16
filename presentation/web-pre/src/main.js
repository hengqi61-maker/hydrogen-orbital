import Reveal from "reveal.js";
import RevealNotes from "reveal.js/plugin/notes";
import RevealMath from "reveal.js/plugin/math";
import "reveal.js/reveal.css";
import "./styles.css";
import { ShootingDemo } from "./interactive/ShootingDemo.js";

const deck = new Reveal({
  width: 1280,
  height: 720,
  margin: 0,
  minScale: 0.2,
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

function syncDemoState(slide = deck.getCurrentSlide()) {
  demo.setActive(slide?.dataset.slide === "interactive");
}

deck.on("ready", ({ currentSlide }) => syncDemoState(currentSlide));
deck.on("slidechanged", ({ currentSlide }) => syncDemoState(currentSlide));

window.addEventListener("keydown", async (event) => {
  if (event.key.toLowerCase() !== "f" || event.metaKey || event.ctrlKey || event.altKey) return;
  if (deck.getCurrentSlide()?.dataset.slide === "interactive" && event.target instanceof HTMLInputElement) return;
  event.preventDefault();
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
});

deck.initialize();
