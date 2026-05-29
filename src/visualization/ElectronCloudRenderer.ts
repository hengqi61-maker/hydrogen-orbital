import * as THREE from "three";
import type { ColorMode, OrbitalData } from "../physics/HydrogenTypes";

export class ElectronCloudRenderer {
  private points?: THREE.Points;

  constructor(private scene: THREE.Scene) {}

  update(
    data: OrbitalData,
    colorMode: ColorMode,
    size: number,
    opacity: number,
  ) {
    this.disposePoints();

    const positions: number[] = [];
    const colors: number[] = [];

    let maxDensity = 0;
    let maxR = 0;
    let maxAbsZ = 0;

    for (const point of data.points) {
      maxDensity = Math.max(maxDensity, point.density);
      maxR = Math.max(maxR, point.r);
      maxAbsZ = Math.max(maxAbsZ, Math.abs(point.z));
    }

    maxDensity ||= 1;
    maxR ||= 1;
    maxAbsZ ||= 1;

    for (const point of data.points) {
      positions.push(point.x, point.y, point.z);

      let t = 0;

      if (colorMode === "density") t = point.density / maxDensity;
      if (colorMode === "radius") t = point.r / maxR;
      if (colorMode === "z") t = (point.z / maxAbsZ + 1) / 2;

      const color = new THREE.Color();
      color.setHSL(0.62 - 0.55 * t, 1, 0.45 + 0.25 * t);
      colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size,
      transparent: true,
      opacity,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);
  }

  updateMaterial(size: number, opacity: number) {
    if (!this.points) return;

    const material = this.points.material as THREE.PointsMaterial;
    material.size = size;
    material.opacity = opacity;
    material.needsUpdate = true;
  }

  dispose() {
    this.disposePoints();
  }

  private disposePoints() {
    if (!this.points) return;

    this.scene.remove(this.points);
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.points = undefined;
  }
}
