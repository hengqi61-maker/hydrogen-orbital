import * as THREE from "three";
import {
  analyticEigenvalue,
  precomputeResidualCurve,
  solveWavefunction,
} from "../physics/shootingSolver.js";

const COLORS = {
  blue: 0x0071e3,
  orange: 0xd86600,
  green: 0x248a3d,
  ink: 0x28425d,
  grid: 0xd8dee7,
  panel: 0xf8f9fb,
};

function line(points, color, opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  return new THREE.Line(geometry, material);
}

function dashedLine(points, color, opacity = 0.7) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color,
    transparent: true,
    opacity,
    dashSize: 0.08,
    gapSize: 0.055,
  });
  const result = new THREE.Line(geometry, material);
  result.computeLineDistances();
  return result;
}

function dot(radius, color) {
  return new THREE.Mesh(
    new THREE.CircleGeometry(radius, 32),
    new THREE.MeshBasicMaterial({ color }),
  );
}

function panelFrame(x, y, width, height) {
  const group = new THREE.Group();
  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ color: COLORS.panel }),
  );
  fill.position.set(x + width / 2, y + height / 2, -0.08);
  group.add(fill);
  group.add(line([
    new THREE.Vector3(x, y, 0),
    new THREE.Vector3(x + width, y, 0),
    new THREE.Vector3(x + width, y + height, 0),
    new THREE.Vector3(x, y + height, 0),
    new THREE.Vector3(x, y, 0),
  ], COLORS.grid));
  return group;
}

class PlotPanel {
  constructor(scene, { x, y, width, height, xMin, xMax, yMin, yMax }) {
    Object.assign(this, { x, y, width, height, xMin, xMax, yMin, yMax });
    this.group = new THREE.Group();
    scene.add(this.group);
    this.group.add(panelFrame(x, y, width, height));
    this.group.add(line([
      new THREE.Vector3(x, this.mapY(0), 0),
      new THREE.Vector3(x + width, this.mapY(0), 0),
    ], COLORS.ink));
    this.group.add(line([
      new THREE.Vector3(x, y, 0),
      new THREE.Vector3(x, y + height, 0),
    ], COLORS.grid));
  }

  mapX(value) {
    return this.x + (value - this.xMin) / (this.xMax - this.xMin) * this.width;
  }

  mapY(value) {
    return this.y + (value - this.yMin) / (this.yMax - this.yMin) * this.height;
  }
}

function svgPath(values, xMap, yMap) {
  return values.map((value, index) => `${index ? "L" : "M"}${xMap(value, index).toFixed(2)},${yMap(value, index).toFixed(2)}`).join(" ");
}

export class ShootingDemo {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector("#shooting-canvas");
    this.fallback = root.querySelector("#shooting-fallback");
    this.slider = document.querySelector("#energy-slider");
    this.energyValue = document.querySelector("#energy-value");
    this.residualValue = document.querySelector("#residual-value");
    this.hitStatus = document.querySelector("#hit-status");
    this.playPause = document.querySelector("#play-pause");
    this.resetButton = document.querySelector("#reset-demo");
    this.snapButtons = [...document.querySelectorAll("[data-eigen]")];
    this.state = { energy: 3.2, playing: false, active: false };
    this.root.dataset.playing = "false";
    this.eMin = 0.2;
    this.eMax = 50;
    this.hitTolerance = 1e-5;
    this.residualCurve = precomputeResidualCurve({ eMin: this.eMin, eMax: this.eMax });
    this.eigenvalues = [1, 2, 3].map((n) => ({ n, energy: analyticEigenvalue(n) }));
    this.lastTime = performance.now();
    this.raf = 0;
    this.bindControls();
    this.initializeRenderer();
    this.update();
  }

  initializeRenderer() {
    try {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xffffff);
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      this.camera = new THREE.OrthographicCamera(-7, 7, 2.7, -2.7, 0.1, 100);
      this.camera.position.z = 10;

      this.wavePanel = new PlotPanel(this.scene, {
        x: -6.4, y: -1.75, width: 5.7, height: 3.55,
        xMin: 0, xMax: 1, yMin: -0.48, yMax: 1.08,
      });
      this.residualPanel = new PlotPanel(this.scene, {
        x: 0.7, y: -1.75, width: 5.7, height: 3.55,
        xMin: this.eMin, xMax: this.eMax, yMin: -0.45, yMax: 1.05,
      });

      this.wavePanel.group.add(dashedLine([
        new THREE.Vector3(this.wavePanel.mapX(1), this.wavePanel.y, 0),
        new THREE.Vector3(this.wavePanel.mapX(1), this.wavePanel.y + this.wavePanel.height, 0),
      ], COLORS.blue));

      this.residualPanel.group.add(line(this.residualCurve.map(({ energy, residual }) =>
        new THREE.Vector3(this.residualPanel.mapX(energy), this.residualPanel.mapY(residual), 0.02)
      ), COLORS.blue));

      for (const eigen of this.eigenvalues) {
        const x = this.residualPanel.mapX(eigen.energy);
        this.residualPanel.group.add(dashedLine([
          new THREE.Vector3(x, this.residualPanel.y, 0.01),
          new THREE.Vector3(x, this.residualPanel.y + this.residualPanel.height, 0.01),
        ], COLORS.orange, 0.5));
        const marker = dot(0.055, COLORS.orange);
        marker.position.set(x, this.residualPanel.mapY(0), 0.05);
        this.residualPanel.group.add(marker);
      }

      this.waveHit = dot(0.075, COLORS.orange);
      this.residualPoint = dot(0.075, COLORS.orange);
      this.wavePanel.group.add(this.waveHit);
      this.residualPanel.group.add(this.residualPoint);
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.root);
      this.root.dataset.renderer = "webgl";
      this.resize();
    } catch (error) {
      console.warn("WebGL unavailable, using SVG fallback.", error);
      this.canvas.hidden = true;
      this.fallback.hidden = false;
      this.useFallback = true;
      this.root.dataset.renderer = "svg-fallback";
    }
  }

  bindControls() {
    this.slider.addEventListener("input", () => {
      this.state.energy = Number(this.slider.value);
      this.setPlaying(false);
      this.update();
    });
    this.playPause.addEventListener("click", () => this.setPlaying(!this.state.playing));
    this.resetButton.addEventListener("click", () => this.reset());
    this.snapButtons.forEach((button) => {
      button.addEventListener("click", () => this.snap(Number(button.dataset.eigen)));
    });
    window.addEventListener("keydown", (event) => {
      if (!this.state.active || event.target instanceof HTMLInputElement) return;
      const key = event.key.toLowerCase();
      if (["1", "2", "3"].includes(key)) {
        this.consumeShortcut(event);
        this.snap(Number(key));
      } else if (key === "a" || key === "d") {
        this.consumeShortcut(event);
        const direction = key === "a" ? -1 : 1;
        const step = event.shiftKey ? 0.1 : 0.01;
        this.setEnergy(this.state.energy + direction * step);
        this.setPlaying(false);
      } else if (key === "p") {
        this.consumeShortcut(event);
        this.setPlaying(!this.state.playing);
      } else if (key === "r") {
        this.consumeShortcut(event);
        this.reset();
      }
    }, true);
  }

  consumeShortcut(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  resize() {
    if (!this.renderer) return;
    const width = Math.max(this.root.clientWidth, 1);
    const height = Math.max(this.root.clientHeight, 1);
    this.renderer.setSize(width, height, false);
    const viewHeight = 5.4;
    const viewWidth = viewHeight * width / height;
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  setActive(active) {
    this.state.active = active;
    this.root.dataset.active = String(active);
    if (active) {
      this.lastTime = performance.now();
      this.resize();
      this.schedule();
    } else {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  setPlaying(playing) {
    this.state.playing = playing;
    this.root.dataset.playing = String(playing);
    this.playPause.textContent = playing ? "Pause" : "Play";
    if (playing && this.state.active) this.schedule();
  }

  setEnergy(energy) {
    this.state.energy = Math.min(this.eMax, Math.max(this.eMin, energy));
    this.slider.value = String(this.state.energy);
    this.update();
  }

  reset() {
    this.setPlaying(false);
    this.setEnergy(3.2);
  }

  snap(n) {
    this.setPlaying(false);
    this.setEnergy(analyticEigenvalue(n));
  }

  nearestEigenvalue() {
    return this.eigenvalues.reduce((best, item) => {
      const distance = Math.abs(item.energy - this.state.energy);
      return distance < best.distance ? { ...item, distance } : best;
    }, { n: 0, energy: 0, distance: Infinity });
  }

  update() {
    const solution = solveWavefunction(this.state.energy);
    const nearest = this.nearestEigenvalue();
    const isHit = Math.abs(solution.residual) < this.hitTolerance || nearest.distance < 5e-4;
    this.currentSolution = { ...solution, isHit, nearest };

    this.energyValue.textContent = `E = ${this.state.energy.toFixed(4)}`;
    this.residualValue.textContent = `F(E) = ${solution.residual.toExponential(3)}`;
    if (isHit) {
      this.hitStatus.textContent = `命中边界：接近 E${nearest.n}`;
      this.hitStatus.dataset.state = "hit";
    } else if (solution.residual > 0) {
      this.hitStatus.textContent = "F(E)>0：仍在零线上方";
      this.hitStatus.dataset.state = "positive";
    } else {
      this.hitStatus.textContent = "F(E)<0：已经越过零线";
      this.hitStatus.dataset.state = "negative";
    }

    if (this.useFallback) this.renderFallback();
    else this.updateThreeScene();
    this.render();
  }

  updateThreeScene() {
    const { xValues, psiValues, residual, isHit } = this.currentSolution;
    if (this.waveCurve) {
      this.wavePanel.group.remove(this.waveCurve);
      this.waveCurve.geometry.dispose();
      this.waveCurve.material.dispose();
    }
    this.waveCurve = line(Array.from(xValues, (x, index) =>
      new THREE.Vector3(this.wavePanel.mapX(x), this.wavePanel.mapY(psiValues[index]), 0.02)
    ), isHit ? COLORS.green : residual >= 0 ? COLORS.blue : COLORS.orange);
    this.wavePanel.group.add(this.waveCurve);
    this.waveHit.position.set(this.wavePanel.mapX(1), this.wavePanel.mapY(residual), 0.06);
    this.waveHit.material.color.setHex(isHit ? COLORS.green : COLORS.orange);
    this.residualPoint.position.set(
      this.residualPanel.mapX(this.state.energy),
      this.residualPanel.mapY(residual),
      0.07,
    );
    this.residualPoint.material.color.setHex(isHit ? COLORS.green : COLORS.orange);
  }

  renderFallback() {
    const { xValues, psiValues, residual, isHit } = this.currentSolution;
    const wave = svgPath([...xValues], (value) => 30 + value * 460,
      (_, index) => 160 - psiValues[index] * 115);
    const residualPath = svgPath(this.residualCurve,
      (value) => 560 + (value.energy - this.eMin) / (this.eMax - this.eMin) * 460,
      (value) => 160 - value.residual * 115);
    const currentX = 560 + (this.state.energy - this.eMin) / (this.eMax - this.eMin) * 460;
    const currentY = 160 - residual * 115;
    const color = isHit ? "#248a3d" : "#d86600";
    this.fallback.innerHTML = `
      <svg viewBox="0 0 1050 290" role="img" aria-label="打靶法静态备用图">
        <rect x="25" y="20" width="470" height="235" fill="#f8f9fb" stroke="#d8dee7"/>
        <rect x="555" y="20" width="470" height="235" fill="#f8f9fb" stroke="#d8dee7"/>
        <line x1="25" y1="160" x2="495" y2="160" stroke="#28425d"/>
        <line x1="555" y1="160" x2="1025" y2="160" stroke="#28425d"/>
        <path d="${wave}" fill="none" stroke="${color}" stroke-width="2"/>
        <path d="${residualPath}" fill="none" stroke="#0071e3" stroke-width="2"/>
        <circle cx="490" cy="${160 - residual * 115}" r="6" fill="${color}"/>
        <circle cx="${currentX}" cy="${currentY}" r="6" fill="${color}"/>
      </svg>`;
  }

  schedule() {
    if (!this.state.active || this.raf) return;
    this.raf = requestAnimationFrame((time) => this.tick(time));
  }

  tick(time) {
    this.raf = 0;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    if (this.state.playing) {
      const nextEnergy = this.state.energy + dt * 4.8;
      this.setEnergy(nextEnergy > this.eMax ? this.eMin : nextEnergy);
    }
    if (this.currentSolution?.isHit && !this.useFallback) {
      const pulse = 1 + 0.12 * Math.sin(time * 0.012);
      this.waveHit.scale.setScalar(pulse);
      this.residualPoint.scale.setScalar(pulse);
      this.render();
    }
    if (this.state.playing || this.currentSolution?.isHit) this.schedule();
  }

  render() {
    if (this.renderer) this.renderer.render(this.scene, this.camera);
  }
}
