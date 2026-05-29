import * as THREE from "three";

export class AxesRenderer {
  group = new THREE.Group();

  constructor(size = 20) {
    const makeAxis = (dir: THREE.Vector3, color: number) => {
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
      });

      const geometry = new THREE.BufferGeometry().setFromPoints([
        dir.clone().multiplyScalar(-size),
        dir.clone().multiplyScalar(size),
      ]);

      return new THREE.Line(geometry, material);
    };

    this.group.add(makeAxis(new THREE.Vector3(1, 0, 0), 0xff7777));
    this.group.add(makeAxis(new THREE.Vector3(0, 1, 0), 0x77ff77));
    this.group.add(makeAxis(new THREE.Vector3(0, 0, 1), 0x7777ff));
  }

  dispose() {
    for (const child of this.group.children) {
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        child.material.dispose();
      }
    }
  }
}
