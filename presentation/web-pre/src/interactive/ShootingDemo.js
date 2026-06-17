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

function cssColor(color) {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function textLabel(text, {
  color = COLORS.ink,
  fontSize = 34,
  height = 0.18,
  fontWeight = 650,
  align = "center",
} = {}) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = `${fontWeight} ${fontSize}px "Helvetica Neue", "PingFang SC", Arial, sans-serif`;
  const metrics = context.measureText(text);
  const paddingX = 18;
  const paddingY = 10;
  canvas.width = Math.ceil(metrics.width + paddingX * 2);
  canvas.height = Math.ceil(fontSize + paddingY * 2);
  context.font = `${fontWeight} ${fontSize}px "Helvetica Neue", "PingFang SC", Arial, sans-serif`;
  context.fillStyle = cssColor(color);
  context.textAlign = align;
  context.textBaseline = "middle";
  const x = align === "left" ? paddingX : align === "right" ? canvas.width - paddingX : canvas.width / 2;
  context.fillText(text, x, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(height * canvas.width / canvas.height, height, 1);
  return sprite;
}

function addTextLabel(group, text, x, y, options = {}) {
  const sprite = textLabel(text, options);
  sprite.position.set(x, y, options.z ?? 0.09);
  group.add(sprite);
  return sprite;
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

  addTickX(value, label, color = COLORS.muted ?? COLORS.ink) {
    const x = this.mapX(value);
    this.group.add(line([
      new THREE.Vector3(x, this.mapY(0) - 0.055, 0.03),
      new THREE.Vector3(x, this.mapY(0) + 0.055, 0.03),
    ], color));
    addTextLabel(this.group, label, x, this.y - 0.2, {
      color,
      fontSize: 42,
      height: 0.24,
    });
  }

  addTickY(value, label, color = COLORS.muted ?? COLORS.ink) {
    const y = this.mapY(value);
    this.group.add(line([
      new THREE.Vector3(this.x - 0.045, y, 0.03),
      new THREE.Vector3(this.x + 0.045, y, 0.03),
    ], color));
    addTextLabel(this.group, label, this.x - 0.22, y, {
      color,
      fontSize: 38,
      height: 0.22,
      align: "right",
    });
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
      this.decorateWavePanel();

      this.residualPanel.group.add(line(this.residualCurve.map(({ energy, residual }) =>
        new THREE.Vector3(this.residualPanel.mapX(energy), this.residualPanel.mapY(residual), 0.02)
      ), COLORS.blue));
      this.decorateResidualPanel();

      for (const eigen of this.eigenvalues) {
        const x = this.residualPanel.mapX(eigen.energy);
        this.residualPanel.group.add(dashedLine([
          new THREE.Vector3(x, this.residualPanel.y, 0.01),
          new THREE.Vector3(x, this.residualPanel.y + this.residualPanel.height, 0.01),
        ], COLORS.orange, 0.5));
        const marker = dot(0.055, COLORS.orange);
        marker.position.set(x, this.residualPanel.mapY(0), 0.05);
        this.residualPanel.group.add(marker);
        addTextLabel(this.residualPanel.group, `E${eigen.n}`, eigen.n === 1 ? x + 0.28 : x, eigen.n === 1 ? this.residualPanel.mapY(0) + 0.28 : this.residualPanel.y + this.residualPanel.height + 0.18, {
          color: COLORS.orange,
          fontSize: 42,
          height: 0.22,
          align: eigen.n === 1 ? "left" : "center",
        });
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

  decorateWavePanel() {
    this.wavePanel.addTickX(0, "x=0", COLORS.ink);
    this.wavePanel.addTickX(1, "x=L", COLORS.blue);
    this.wavePanel.addTickY(0, "ψ=0", COLORS.ink);
    addTextLabel(this.wavePanel.group, "位置 x", this.wavePanel.x + this.wavePanel.width / 2, this.wavePanel.y - 0.43, {
      color: COLORS.ink,
      fontSize: 44,
      height: 0.25,
    });
    addTextLabel(this.wavePanel.group, "波函数  ψ(x)", this.wavePanel.x + 0.1, this.wavePanel.y + this.wavePanel.height + 0.18, {
      color: COLORS.ink,
      fontSize: 44,
      height: 0.25,
      align: "left",
    });
    addTextLabel(this.wavePanel.group, "右边界 x=L", this.wavePanel.mapX(1) - 0.42, this.wavePanel.y + this.wavePanel.height - 0.22, {
      color: COLORS.blue,
      fontSize: 40,
      height: 0.22,
      align: "right",
    });
  }

  decorateResidualPanel() {
    this.residualPanel.addTickX(this.eMin, "E=0", COLORS.ink);
    this.residualPanel.addTickX(this.eMax, "E=50", COLORS.ink);
    this.residualPanel.addTickY(0, "0", COLORS.ink);
    addTextLabel(this.residualPanel.group, "猜测能量 E", this.residualPanel.x + this.residualPanel.width / 2, this.residualPanel.y - 0.43, {
      color: COLORS.ink,
      fontSize: 44,
      height: 0.25,
    });
    addTextLabel(this.residualPanel.group, "残差  F(E)=ψE(L)", this.residualPanel.x + 0.1, this.residualPanel.y + this.residualPanel.height + 0.18, {
      color: COLORS.ink,
      fontSize: 44,
      height: 0.25,
      align: "left",
    });
    addTextLabel(this.residualPanel.group, "零点：允许能量", this.residualPanel.x + this.residualPanel.width - 0.12, this.residualPanel.mapY(0) + 0.18, {
      color: COLORS.orange,
      fontSize: 40,
      height: 0.22,
      align: "right",
    });
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
        <line x1="25" y1="20" x2="25" y2="255" stroke="#d8dee7"/>
        <line x1="555" y1="20" x2="555" y2="255" stroke="#d8dee7"/>
        <text x="30" y="15" fill="#28425d" font-size="18" font-weight="650">波函数 ψ(x)</text>
        <text x="260" y="284" fill="#28425d" font-size="18" font-weight="650" text-anchor="middle">位置 x</text>
        <text x="25" y="274" fill="#28425d" font-size="15" text-anchor="middle">x=0</text>
        <text x="490" y="274" fill="#0071e3" font-size="15" text-anchor="middle">x=L</text>
        <text x="505" y="42" fill="#0071e3" font-size="15" text-anchor="end">右边界 x=L</text>
        <text x="560" y="15" fill="#28425d" font-size="18" font-weight="650">残差 F(E)=ψ_E(L)</text>
        <text x="790" y="284" fill="#28425d" font-size="18" font-weight="650" text-anchor="middle">猜测能量 E</text>
        <text x="555" y="274" fill="#28425d" font-size="15" text-anchor="middle">E=0</text>
        <text x="1025" y="274" fill="#28425d" font-size="15" text-anchor="middle">E=50</text>
        <text x="1015" y="150" fill="#d86600" font-size="15" text-anchor="end">F(E)=0 零点</text>
        <path d="${wave}" fill="none" stroke="${color}" stroke-width="2"/>
        <path d="${residualPath}" fill="none" stroke="#0071e3" stroke-width="2"/>
        ${this.eigenvalues.map((eigen) => {
          const x = 560 + (eigen.energy - this.eMin) / (this.eMax - this.eMin) * 460;
          return `<line x1="${x}" y1="20" x2="${x}" y2="255" stroke="#d86600" stroke-dasharray="7 7" opacity="0.5"/>
            <text x="${x}" y="38" fill="#d86600" font-size="15" text-anchor="middle">E${eigen.n}</text>`;
        }).join("")}
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
