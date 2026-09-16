import * as THREE from 'three';
import { gsap } from 'gsap';
import type { Category } from '../content/types';
import { createTimelineController } from '../animation/timelines';
import { makeExtrudedMesh, makeTag, roundedRectShape } from '../three/geometry';
import { createHandle, damp, type SculptModelHandle } from '../three/runtime';

const ASSET_ROOT = '/assets/internship-board';
const BOARD_SIZE = 7;
const BACKDROP_SIZE = 48;
const LABEL_HOVER_SCALE = 1.06;

type LayerSpec = {
  name: string;
  file: string;
  width: number;
  height: number;
  x: number;
  y: number;
  z: number;
  rotation?: number;
  shadow?: boolean;
};

function loadArtworkTexture(file: string): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const texture = new THREE.TextureLoader().load(`${ASSET_ROOT}/${file}`, (loaded) => {
    loaded.colorSpace = THREE.SRGBColorSpace;
    loaded.minFilter = THREE.LinearMipmapLinearFilter;
    loaded.magFilter = THREE.LinearFilter;
    loaded.anisotropy = 8;
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createArtworkLayer(spec: LayerSpec): THREE.Mesh {
  const texture = loadArtworkTexture(spec.file);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: texture ? '#FFFFFF' : '#F6E7C0',
    transparent: spec.file !== 'corkboard.webp',
    alphaTest: spec.file === 'corkboard.webp' ? 0 : 0.025,
    depthWrite: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.width, spec.height), material);
  mesh.name = spec.name;
  mesh.position.set(spec.x, spec.y, spec.z);
  mesh.rotation.z = spec.rotation ?? 0;
  mesh.castShadow = spec.shadow ?? true;
  mesh.receiveShadow = true;
  mesh.renderOrder = Math.round(spec.z * 100);
  mesh.userData.assetSource = spec.file;
  return mesh;
}

function register(parts: Map<string, THREE.Object3D>, parent: THREE.Object3D, object: THREE.Object3D): void {
  parent.add(object);
  parts.set(object.name, object);
  object.traverse((child) => {
    if (child.name && !parts.has(child.name)) parts.set(child.name, child);
  });
}

export function createJourneyModel(category: Category, reducedMotion = false): SculptModelHandle {
  const root = new THREE.Group();
  root.name = `corkboard-${category.id}`;
  root.userData.open = false;
  root.userData.reducedMotion = reducedMotion;
  const prefersStillness = () => root.userData.reducedMotion === true;
  const timelines = createTimelineController({ reducedMotion: prefersStillness });
  const parts = new Map<string, THREE.Object3D>([['root', root]]);
  const targets: THREE.Object3D[] = [];

  const rig = new THREE.Group();
  rig.name = 'corkboard-hover-rig';
  root.add(rig);
  parts.set(rig.name, rig);

  const boardBack = makeExtrudedMesh(roundedRectShape(BOARD_SIZE + 0.12, BOARD_SIZE + 0.12, 0.12), '#4B2518', 0.16, 0.035);
  boardBack.name = 'board-back';
  boardBack.position.z = -0.28;
  boardBack.castShadow = true;
  boardBack.receiveShadow = true;
  register(parts, rig, boardBack);

  const board = createArtworkLayer({
    name: 'corkboard-background', file: 'corkboard.webp', width: BOARD_SIZE, height: BOARD_SIZE,
    x: 0, y: 0, z: -0.02, shadow: false,
  });
  board.userData.action = 'journey-hover-surface';
  register(parts, rig, board);
  targets.push(board);

  const artwork: LayerSpec[] = [
    { name: 'lined-paper', file: 'lined-paper.png', width: 2.02, height: 2.66, x: -2.18, y: 1.61, z: 0.08, rotation: -0.055 },
    { name: 'torn-paper', file: 'torn-paper.png', width: 2.86, height: 1.69, x: 1.87, y: 1.62, z: 0.1, rotation: 0.035 },
    { name: 'calendar', file: 'calendar.png', width: 2.18, height: 1.78, x: -2.04, y: -0.32, z: 0.13, rotation: -0.075 },
    { name: 'photo-stack', file: 'photo-stack.png', width: 2.45, height: 2.06, x: 0.1, y: -1.76, z: 0.16, rotation: 0.035 },
    { name: 'flower-decoration', file: 'flower.png', width: 1.0, height: 1.66, x: -2.95, y: 1.98, z: 0.26, rotation: -0.16 },
    { name: 'heart-decoration', file: 'heart.png', width: 1.22, height: 1.04, x: 2.42, y: 2.55, z: 0.28, rotation: 0.08 },
    { name: 'keychain-decoration', file: 'keychain.png', width: 1.27, height: 1.62, x: 2.72, y: -0.28, z: 0.31, rotation: -0.11 },
  ];
  artwork.forEach((spec) => register(parts, rig, createArtworkLayer(spec)));

  const labels: LayerSpec[] = [
    { name: 'internship-label-migu', file: 'internship_label_migu.png', width: 2.49, height: 2.52, x: -1.65, y: 1.38, z: 0.42, rotation: -0.13 },
    { name: 'internship-label-youdao', file: 'internship_label_youdao.png', width: 2.58, height: 2.58, x: -0.05, y: 1.95, z: 0.44, rotation: 0.1 },
    { name: 'internship-label-kuaishou', file: 'internship_label_kuaishou.png', width: 2.37, height: 2.49, x: 1.2, y: 0.7, z: 0.46, rotation: -0.09 },
    { name: 'internship-label-jd', file: 'internship_label_jd.png', width: 2.52, height: 2.49, x: 2.2, y: -0.95, z: 0.48, rotation: 0.12 },
  ];
  const labelLayers = labels.map((spec, stationIndex) => {
    const label = createArtworkLayer(spec);
    label.userData.action = 'select-journey-station';
    label.userData.stationIndex = stationIndex;
    register(parts, rig, label);
    targets.push(label);
    return label;
  });

  const popup = new THREE.Group();
  popup.name = 'internship-detail-popup';
  popup.visible = false;
  register(parts, root, popup);

  const backdropMaterial = new THREE.MeshBasicMaterial({
    color: '#15120E', transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
  });
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(BACKDROP_SIZE, BACKDROP_SIZE), backdropMaterial);
  backdrop.name = 'internship-detail-backdrop';
  backdrop.position.z = 0.62;
  backdrop.renderOrder = 1000;
  backdrop.userData.action = 'close-journey-popup';
  register(parts, popup, backdrop);
  targets.push(backdrop);

  const details = [
    { name: 'internship-detail-migu', file: 'internship_detail_migu.png' },
    { name: 'internship-detail-youdao', file: 'internship_detail_youdao.png' },
    { name: 'internship-detail-kuaishou', file: 'internship_detail_kuaishou.png' },
    { name: 'internship-detail-jd', file: 'internship_detail_jd.png' },
  ];
  const detailLayers = details.map((detail) => {
    const layer = createArtworkLayer({
      ...detail, width: 4.25, height: 5.67, x: 0, y: 0.08, z: 0.68, shadow: true,
    });
    layer.visible = false;
    layer.renderOrder = 1001;
    layer.userData.action = 'close-journey-popup';
    const material = layer.material as THREE.MeshBasicMaterial;
    material.opacity = 0;
    material.depthWrite = false;
    register(parts, popup, layer);
    targets.push(layer);
    return layer;
  });

  const closeTag = makeTag('关闭', '#8ED7E2', 'close-detail');
  closeTag.name = 'close-tag';
  closeTag.position.set(0, -3.78, 0.18);
  register(parts, root, closeTag);
  targets.push(closeTag);

  let hovered = false;
  let hoveredLabel: THREE.Mesh | null = null;

  const resetLabel = (label: THREE.Mesh, immediate = false): void => {
    const spec = labels[labelLayers.indexOf(label)];
    if (!spec) return;
    gsap.to(label.scale, {
      x: 1, y: 1, z: 1, duration: immediate ? 0 : 0.18, ease: 'power2.out', overwrite: 'auto',
    });
    gsap.to(label.position, {
      z: spec.z, duration: immediate ? 0 : 0.18, ease: 'power2.out', overwrite: 'auto',
    });
  };

  const setHoveredLabel = (target: THREE.Object3D | null): void => {
    const next = labelLayers.includes(target as THREE.Mesh) ? target as THREE.Mesh : null;
    if (next === hoveredLabel) return;
    if (hoveredLabel) resetLabel(hoveredLabel, prefersStillness());
    hoveredLabel = next;
    if (!hoveredLabel || prefersStillness() || popup.visible) return;
    const spec = labels[labelLayers.indexOf(hoveredLabel)]!;
    gsap.to(hoveredLabel.scale, {
      x: LABEL_HOVER_SCALE, y: LABEL_HOVER_SCALE, z: 1,
      duration: 0.2, ease: 'power2.out', overwrite: 'auto',
    });
    gsap.to(hoveredLabel.position, {
      z: spec.z + 0.1, duration: 0.2, ease: 'power2.out', overwrite: 'auto',
    });
  };

  let activeDetailIndex = -1;
  const setPopup = (index: number): Promise<void> => timelines.run((timeline) => {
    const open = index >= 0 && index < detailLayers.length;
    if (open) {
      const source = labels[index]!;
      const detail = detailLayers[index]!;
      const material = detail.material as THREE.MeshBasicMaterial;
      if (hoveredLabel) resetLabel(hoveredLabel, true);
      hoveredLabel = null;
      activeDetailIndex = index;
      popup.visible = true;
      backdropMaterial.opacity = 0;
      detailLayers.forEach((layer) => { layer.visible = layer === detail; });
      material.opacity = 0;
      detail.position.set(source.x, source.y, 0.68);
      detail.rotation.z = source.rotation ?? 0;
      detail.scale.setScalar(0.38);
      timeline
        .to(backdropMaterial, { opacity: 0.58, duration: 0.24, ease: 'power1.out' }, 0)
        .to(material, { opacity: 1, duration: 0.2, ease: 'power1.out' }, 0.04)
        .to(detail.position, { x: 0, y: 0.08, duration: 0.38, ease: 'power3.out' }, 0)
        .to(detail.rotation, { z: 0, duration: 0.38, ease: 'power3.out' }, 0)
        .to(detail.scale, { x: 1, y: 1, z: 1, duration: 0.38, ease: 'back.out(1.18)' }, 0);
      return;
    }
    const closingIndex = activeDetailIndex;
    const source = labels[closingIndex];
    const detail = detailLayers[closingIndex];
    if (!source || !detail) {
      popup.visible = false;
      activeDetailIndex = -1;
      return;
    }
    const material = detail.material as THREE.MeshBasicMaterial;
    timeline
      .to(detail.position, { x: source.x, y: source.y, duration: 0.24, ease: 'power2.in' }, 0)
      .to(detail.rotation, { z: source.rotation ?? 0, duration: 0.24, ease: 'power2.in' }, 0)
      .to(detail.scale, { x: 0.38, y: 0.38, z: 0.38, duration: 0.24, ease: 'power2.in' }, 0)
      .to(material, { opacity: 0, duration: 0.18, ease: 'power1.in' }, 0.04)
      .to(backdropMaterial, { opacity: 0, duration: 0.22, ease: 'power1.in' }, 0.02)
      .call(() => {
        detail.visible = false;
        popup.visible = false;
        activeDetailIndex = -1;
      });
  });

  const handle = createHandle(root, parts, targets, {
    setHovered: (value) => { hovered = value; },
    setHoveredTarget: setHoveredLabel,
    setReducedMotion: (value) => {
      root.userData.reducedMotion = value;
      if (value && hoveredLabel) resetLabel(hoveredLabel, true);
    },
    setProject: setPopup,
    open: () => timelines.run((timeline) => {
      root.userData.open = true;
      rig.scale.setScalar(0.82);
      artwork.forEach((spec) => parts.get(spec.name)?.scale.setScalar(0.04));
      labelLayers.forEach((label) => label.scale.setScalar(0.04));
      timeline.to(rig.scale, { x: 1, y: 1, z: 1, duration: 0.38, ease: 'power2.out' }, 0);
      artwork.forEach((spec, index) => {
        timeline.to(parts.get(spec.name)!.scale, {
          x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(1.45)',
        }, 0.12 + index * 0.045);
      });
      labelLayers.forEach((label, index) => {
        timeline.to(label.scale, {
          x: 1, y: 1, z: 1, duration: 0.34, ease: 'back.out(1.7)',
        }, 0.38 + index * 0.065);
      });
    }),
    close: () => timelines.run((timeline) => {
      root.userData.open = false;
      timeline.to(rig.scale, { x: 0.04, y: 0.04, z: 0.04, duration: 0.36, ease: 'power2.in' }, 0);
    }),
  }, (delta, elapsed) => {
    const pointer = root.userData.hoverPointer ?? { x: 0, y: 0 };
    const amount = hovered && !prefersStillness() ? 1 : 0;
    rig.rotation.y = damp(rig.rotation.y, pointer.x * 0.045 * amount, 7, delta);
    rig.rotation.x = damp(rig.rotation.x, -pointer.y * 0.03 * amount, 7, delta);
    const still = prefersStillness();
    labelLayers.forEach((label, index) => {
      if (label === hoveredLabel) return;
      const lift = hovered && !still ? Math.sin(elapsed * 1.45 + index * 0.8) * 0.012 : 0;
      label.position.z = damp(label.position.z, labels[index]!.z + lift, 6, delta);
    });
  });
  const baseDispose = handle.dispose;
  handle.dispose = () => {
    timelines.killActiveTimeline();
    gsap.killTweensOf(labelLayers.flatMap((label) => [label.scale, label.position]));
    baseDispose();
  };
  return handle;
}
