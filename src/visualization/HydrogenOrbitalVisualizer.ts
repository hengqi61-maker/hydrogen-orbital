import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ColorMode, OrbitalData, OrbitalSettings } from "../physics/HydrogenTypes";
import { AxesRenderer } from "./AxesRenderer";
import { ElectronCloudRenderer } from "./ElectronCloudRenderer";

export class HydrogenOrbitalVisualizer {
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private cloud: ElectronCloudRenderer;
  private axes = new AxesRenderer(25);
  private nucleus: THREE.Mesh;
  private animationFrameId = 0;
  private currentData?: OrbitalData;
  private colorMode: ColorMode;

  constructor(
    private container: HTMLDivElement,
    private settings: OrbitalSettings,
  ) {
    this.colorMode = settings.colorMode;
    this.scene.background = new THREE.Color(0x05070d);

    const { width, height } = this.getSize();

    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 2000);
    this.camera.position.set(0, -45, 25);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.cloud = new ElectronCloudRenderer(this.scene);

    const light = new THREE.PointLight(0xffffff, 2);
    light.position.set(10, 15, 20);
    this.scene.add(light);

    this.scene.add(this.axes.group);

    this.nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 32, 16),
      new THREE.MeshStandardMaterial({
        color: 0xff3333,
        emissive: 0x660000,
      }),
    );
    this.scene.add(this.nucleus);

    window.addEventListener("resize", this.resize);
    this.applySettings(settings);
    this.animate();
  }

  renderOrbital(data: OrbitalData) {
    this.currentData = data;
    this.colorMode = this.settings.colorMode;

    this.cloud.update(
      data,
      this.settings.colorMode,
      this.settings.pointSize,
      this.settings.opacity,
    );
  }

  applySettings(settings: OrbitalSettings) {
    const shouldRecolor = this.colorMode !== settings.colorMode;
    this.settings = settings;

    this.axes.group.visible = settings.showAxes;
    this.nucleus.visible = settings.showNucleus;

    if (shouldRecolor && this.currentData) {
      this.colorMode = settings.colorMode;
      this.cloud.update(
        this.currentData,
        settings.colorMode,
        settings.pointSize,
        settings.opacity,
      );
      return;
    }

    this.cloud.updateMaterial(settings.pointSize, settings.opacity);
  }

  dispose() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener("resize", this.resize);
    this.controls.dispose();
    this.cloud.dispose();
    this.axes.dispose();
    this.nucleus.geometry.dispose();
    (this.nucleus.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }

  private getSize() {
    return {
      width: Math.max(1, this.container.clientWidth),
      height: Math.max(1, this.container.clientHeight),
    };
  }

  private resize = () => {
    const { width, height } = this.getSize();

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (this.settings.autoRotate) {
      this.scene.rotation.z += 0.002;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}
