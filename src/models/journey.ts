import * as THREE from 'three';
import { gsap } from 'gsap';
import type { Category } from '../content/types';
import { findSheetTextPage, SHEET_PLATE } from '../content/internshipSheetText';
import { createTimelineController } from '../animation/timelines';
import { makeExtrudedMesh, makeTag, roundedRectShape } from '../three/geometry';
import { createHandle, damp, type SculptModelHandle } from '../three/runtime';
import {
  getLoadedImageAsset,
  loadImageAsset,
  preloadImageAssets,
  type ImageLoadProgress,
} from '../performance/imageAssets';

const ASSET_ROOT = '/assets/internship-board';
const BOARD_SIZE = 7;
const CONTENT_SCALE = 2 / 3;
const PAGE_BACKGROUND_WIDTH = 18;
const PAGE_BACKGROUND_HEIGHT = 32;
const BACKDROP_SIZE = 48;
const LABEL_HOVER_SCALE = 1.06;
/** Vertical rest position of an opened internship sheet. */
const POPUP_REST_Y = 0.08;

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

const primaryArtworkFiles = [
  'corkboard.webp',
  'internship-background.png',
  'lined-paper.webp',
  'torn-paper.webp',
  'calendar.webp',
  'photo-stack.webp',
  'flower.webp',
  'heart.webp',
  'keychain.webp',
  'internship_label_migu.webp',
  'internship_label_youdao.webp',
  'internship_label_kuaishou.webp',
  'internship_label_jd.webp',
  'internship_label_zhuanzhuan.webp',
] as const;

/** Every station opens the same text-free paper plate; only the copy differs. */
const detailArtworkFiles = [SHEET_PLATE] as const;

export const journeyAssetUrls = [...primaryArtworkFiles, ...detailArtworkFiles]
  .map((file) => `${ASSET_ROOT}/${file}`);

export function preloadJourneyBoardAssets(
  onProgress?: (progress: ImageLoadProgress) => void,
): Promise<string[]> {
  return preloadImageAssets(
    primaryArtworkFiles.map((file) => `${ASSET_ROOT}/${file}`),
    onProgress,
    'high',
  );
}

function loadArtworkTexture(file: string, allowNetwork = true): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const cachedImage = getLoadedImageAsset(`${ASSET_ROOT}/${file}`);
  if (cachedImage) {
    const cachedTexture = new THREE.Texture(cachedImage);
    cachedTexture.colorSpace = THREE.SRGBColorSpace;
    cachedTexture.minFilter = THREE.LinearMipmapLinearFilter;
    cachedTexture.magFilter = THREE.LinearFilter;
    cachedTexture.anisotropy = 8;
    cachedTexture.needsUpdate = true;
    return cachedTexture;
  }
  if (!allowNetwork) return null;
  const texture = new THREE.TextureLoader().load(`${ASSET_ROOT}/${file}`, (loaded) => {
    loaded.colorSpace = THREE.SRGBColorSpace;
    loaded.minFilter = THREE.LinearMipmapLinearFilter;
    loaded.magFilter = THREE.LinearFilter;
    loaded.anisotropy = 8;
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createArtworkLayer(spec: LayerSpec, deferTexture = false): THREE.Mesh {
  const texture = loadArtworkTexture(spec.file, !deferTexture);
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

async function ensureArtworkTexture(mesh: THREE.Mesh, file: string): Promise<void> {
  const material = mesh.material as THREE.MeshBasicMaterial;
  if (material.map) return;
  if (typeof Image === 'undefined') return;
  const image = await loadImageAsset(`${ASSET_ROOT}/${file}`, 'high');
  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  material.map = texture;
  material.color.set('#FFFFFF');
  material.needsUpdate = true;
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
  rig.scale.setScalar(CONTENT_SCALE);
  root.add(rig);
  parts.set(rig.name, rig);

  const pageBackground = createArtworkLayer({
    name: 'internship-page-background', file: 'internship-background.png',
    width: PAGE_BACKGROUND_WIDTH, height: PAGE_BACKGROUND_HEIGHT,
    x: 0, y: 0, z: -0.72, rotation: Math.PI / 2, shadow: false,
  });
  (pageBackground.material as THREE.MeshBasicMaterial).depthWrite = false;
  register(parts, root, pageBackground);

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
    { name: 'lined-paper', file: 'lined-paper.webp', width: 2.02, height: 2.66, x: -2.18, y: 1.61, z: 0.08, rotation: -0.055 },
    { name: 'torn-paper', file: 'torn-paper.webp', width: 2.86, height: 1.69, x: 1.87, y: 1.62, z: 0.1, rotation: 0.035 },
    { name: 'calendar', file: 'calendar.webp', width: 2.18, height: 1.78, x: -2.04, y: -0.32, z: 0.13, rotation: -0.075 },
    { name: 'photo-stack', file: 'photo-stack.webp', width: 2.45, height: 2.06, x: 0.1, y: -1.76, z: 0.16, rotation: 0.035 },
    { name: 'flower-decoration', file: 'flower.webp', width: 1.0, height: 1.66, x: -2.95, y: 1.98, z: 0.26, rotation: -0.16 },
    { name: 'heart-decoration', file: 'heart.webp', width: 1.22, height: 1.04, x: 2.42, y: 2.55, z: 0.28, rotation: 0.08 },
    { name: 'keychain-decoration', file: 'keychain.webp', width: 1.27, height: 1.62, x: 2.72, y: -0.28, z: 0.31, rotation: -0.11 },
  ];
  artwork.forEach((spec) => register(parts, rig, createArtworkLayer(spec)));

  // The five notes ring the cork instead of stacking on the middle of it, so
  // every note stays readable: each one only clips a corner of the note pinned
  // under it, the centres stay far enough apart that the cluster still reads as
  // five separate pins, and the tilts keep the ring from looking like a clock
  // face. The ring is centred on the board and every note sits inside the frame.
  const labels: LayerSpec[] = [
    { name: 'internship-label-migu', file: 'internship_label_migu.webp', width: 2.49, height: 2.52, x: -0.82, y: 1.75, z: 0.42, rotation: -0.13 },
    { name: 'internship-label-youdao', file: 'internship_label_youdao.webp', width: 2.58, height: 2.58, x: -1.92, y: -0.23, z: 0.44, rotation: 0.07 },
    { name: 'internship-label-kuaishou', file: 'internship_label_kuaishou.webp', width: 2.37, height: 2.49, x: -0.27, y: -1.93, z: 0.46, rotation: 0.11 },
    { name: 'internship-label-jd', file: 'internship_label_jd.webp', width: 2.52, height: 2.49, x: 1.68, y: -0.9, z: 0.48, rotation: -0.12 },
    { name: 'internship-label-zhuanzhuan', file: 'internship_label_zhuanzhuan.webp', width: 2.34, height: 2.38, x: 1.33, y: 1.45, z: 0.5, rotation: 0.15 },
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

  // Every station ships a text-free plate and draws its copy as real DOM text
  // on top of the sheet, so the type stays vector sharp at any display density.
  const details = [
    { id: 'migu', name: 'internship-detail-migu' },
    { id: 'youdao', name: 'internship-detail-youdao' },
    { id: 'kuaishou', name: 'internship-detail-kuaishou' },
    { id: 'jd', name: 'internship-detail-jd' },
    { id: 'zhuanzhuan', name: 'internship-detail-zhuanzhuan' },
  ].map((detail) => ({
    ...detail,
    file: findSheetTextPage(detail.id)?.background ?? `internship_detail_${detail.id}.png`,
  }));
  const detailLayers = details.map((detail) => {
    const layer = createArtworkLayer({
      ...detail, width: 4.25, height: 5.67, x: 0, y: 0.08, z: 0.68, shadow: true,
    }, true);
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

  const popupPan = (): { x: number; y: number } => {
    const pan = root.userData.popupPan as { x: number; y: number } | undefined;
    return pan ?? { x: 0, y: 0 };
  };

  /**
   * Snaps a world offset onto the viewport's pixel grid. The sheet is shown at
   * one bitmap pixel per device pixel, so landing on whole pixels means the GPU
   * copies the source instead of resampling it.
   */
  const snapToPixelGrid = (value: number): number => {
    const fit = root.userData.popupFit as { worldPerPixel?: number } | undefined;
    const step = fit?.worldPerPixel;
    if (typeof step !== 'number' || step <= 0) return value;
    return Math.round(value / step) * step;
  };

  const popupRestPosition = (): { x: number; y: number } => {
    const pan = popupPan();
    return { x: snapToPixelGrid(pan.x), y: snapToPixelGrid(POPUP_REST_Y + pan.y) };
  };

  /** World units the open sheet exceeds the viewport by, 0 when it fits. */
  const popupOverflowY = (): number => {
    const fit = root.userData.popupFit as { overflowY?: number } | undefined;
    return typeof fit?.overflowY === 'number' && fit.overflowY > 0 ? fit.overflowY : 0;
  };

  const setPopup = async (index: number): Promise<void> => {
    if (index >= 0 && index < detailLayers.length) {
      await ensureArtworkTexture(detailLayers[index]!, details[index]!.file);
    }
    return timelines.run((timeline) => {
    const open = index >= 0 && index < detailLayers.length;
    if (open) {
      const source = labels[index]!;
      const detail = detailLayers[index]!;
      const material = detail.material as THREE.MeshBasicMaterial;
      if (hoveredLabel) resetLabel(hoveredLabel, true);
      hoveredLabel = null;
      activeDetailIndex = index;
      // A sheet taller than the viewport is read from the top and panned by
      // dragging, instead of being shrunk until the copy turns to mush.
      root.userData.popupPan = { x: 0, y: -popupOverflowY() / 2 };
      popup.visible = true;
      backdropMaterial.opacity = 0;
      detailLayers.forEach((layer) => { layer.visible = layer === detail; });
      material.opacity = 0;
      detail.position.set(source.x, source.y, 0.68);
      detail.rotation.z = source.rotation ?? 0;
      detail.scale.setScalar(0.38);
      const rest = popupRestPosition();
      timeline
        .to(backdropMaterial, { opacity: 0.58, duration: 0.24, ease: 'power1.out' }, 0)
        .to(material, { opacity: 1, duration: 0.2, ease: 'power1.out' }, 0.04)
        .to(detail.position, { x: rest.x, y: rest.y, duration: 0.38, ease: 'power3.out' }, 0)
        .to(detail.rotation, { z: 0, duration: 0.38, ease: 'power3.out' }, 0)
        .to(detail.scale, {
          x: root.userData.popupScale ?? 1,
          y: root.userData.popupScale ?? 1,
          z: root.userData.popupScale ?? 1,
          duration: 0.38,
          ease: 'back.out(1.18)',
        }, 0);
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
        root.userData.popupPan = { x: 0, y: 0 };
      });
    });
  };

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
      rig.scale.setScalar(CONTENT_SCALE * 0.82);
      artwork.forEach((spec) => parts.get(spec.name)?.scale.setScalar(0.04));
      labelLayers.forEach((label) => label.scale.setScalar(0.04));
      timeline.to(rig.scale, {
        x: CONTENT_SCALE, y: CONTENT_SCALE, z: CONTENT_SCALE,
        duration: 0.38, ease: 'power2.out',
      }, 0);
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
    // Panning only owns the sheet once its open/close timeline has settled.
    const activeDetail = activeDetailIndex >= 0 ? detailLayers[activeDetailIndex] : undefined;
    if (activeDetail && !timelines.locked) {
      const rest = popupRestPosition();
      activeDetail.position.x = rest.x;
      activeDetail.position.y = rest.y;
    }
  });
  const baseDispose = handle.dispose;
  handle.dispose = () => {
    timelines.killActiveTimeline();
    gsap.killTweensOf(labelLayers.flatMap((label) => [label.scale, label.position]));
    baseDispose();
  };
  return handle;
}
