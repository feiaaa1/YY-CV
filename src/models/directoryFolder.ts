import * as THREE from 'three';
import type { Category } from '../content/types';
import { createTimelineController } from '../animation/timelines';
import { makeExtrudedMesh, makeTextPanel, roundedRectShape } from '../three/geometry';
import { createHandle, damp, type SculptModelHandle } from '../three/runtime';

export type CollageVariant = 'sport' | 'business' | 'technology' | 'culture' | 'cinema';

const collagePalettes: Record<CollageVariant, string[]> = {
  sport: ['#FF555E', '#F7F7EE', '#17213D', '#FFD45E', '#4FA7FF'],
  business: ['#F7F7EE', '#1C253F', '#F4B84F', '#72D9B1', '#FF775E'],
  technology: ['#242A43', '#A375D5', '#E6E2D8', '#FF875A', '#6CB7E8'],
  culture: ['#F2E9D9', '#9E6A3D', '#42603D', '#F25B63', '#F6CD54'],
  cinema: ['#F4E7D6', '#1D243A', '#E1545D', '#F6C64E', '#8A66C5'],
};

const FOLDER_WIDTH = 2.68;
const REAR_BODY_HEIGHT = 2.15;
const FRONT_HEIGHT = 1.53;
const BOTTOM_SEAM_Y = -REAR_BODY_HEIGHT / 2;

function mixColor(color: string, target: string, amount: number): string {
  return `#${new THREE.Color(color).lerp(new THREE.Color(target), amount).getHexString()}`;
}

function directoryRearShape(): THREE.Shape {
  const left = -FOLDER_WIDTH / 2;
  const right = FOLDER_WIDTH / 2;
  const bottom = -REAR_BODY_HEIGHT / 2;
  const top = REAR_BODY_HEIGHT / 2;
  const radius = 0.23;
  const tabLeft = left + 0.18;
  const tabRight = left + 0.98;
  const tabTop = top + 0.34;
  const tabRadius = 0.13;
  const shape = new THREE.Shape();

  shape.moveTo(left + radius, bottom);
  shape.lineTo(right - radius, bottom);
  shape.quadraticCurveTo(right, bottom, right, bottom + radius);
  shape.lineTo(right, top - radius);
  shape.quadraticCurveTo(right, top, right - radius, top);
  shape.lineTo(tabRight + tabRadius, top);
  shape.quadraticCurveTo(tabRight, top, tabRight, top + tabRadius);
  shape.lineTo(tabRight, tabTop - tabRadius);
  shape.quadraticCurveTo(tabRight, tabTop, tabRight - tabRadius, tabTop);
  shape.lineTo(tabLeft + tabRadius, tabTop);
  shape.quadraticCurveTo(tabLeft, tabTop, tabLeft, tabTop - tabRadius);
  shape.lineTo(tabLeft, top + tabRadius);
  shape.quadraticCurveTo(tabLeft, top, tabLeft - tabRadius, top);
  shape.lineTo(left + radius, top);
  shape.quadraticCurveTo(left, top, left, top - radius);
  shape.lineTo(left, bottom + radius);
  shape.quadraticCurveTo(left, bottom, left + radius, bottom);
  shape.closePath();
  return shape;
}

function makeCutout(
  shape: 'circle' | 'card' | 'disk' | 'ticket' | 'dot',
  color: string,
): { backing: THREE.Mesh; artwork: THREE.Mesh } {
  if (shape === 'circle' || shape === 'disk' || shape === 'dot') {
    const radius = shape === 'dot' ? 0.16 : shape === 'circle' ? 0.29 : 0.25;
    const sides = shape === 'circle' ? 24 : 10;
    const backing = new THREE.Mesh(
      new THREE.CylinderGeometry(radius + 0.055, radius + 0.055, 0.018, sides),
      new THREE.MeshStandardMaterial({ color: '#FFFDF5', roughness: 0.92 }),
    );
    const artwork = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 0.012, sides),
      new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
    );
    backing.rotation.x = Math.PI / 2;
    artwork.rotation.x = Math.PI / 2;
    return { backing, artwork };
  }

  const height = shape === 'ticket' ? 0.76 : 0.62;
  return {
    backing: makeExtrudedMesh(roundedRectShape(0.62, height + 0.08, 0.09), '#FFFDF5', 0.018, 0.006),
    artwork: makeExtrudedMesh(roundedRectShape(0.53, height - 0.02, 0.065), color, 0.012, 0.004),
  };
}

function addCollage(group: THREE.Group, parts: Map<string, THREE.Object3D>, variant: CollageVariant): void {
  const palette = collagePalettes[variant];
  const placements = [
    { x: -0.8, y: 0.15, r: -0.25, shape: 'card' },
    { x: -0.38, y: 0.34, r: 0.08, shape: 'ticket' },
    { x: 0.08, y: 0.22, r: -0.12, shape: 'dot' },
    { x: 0.48, y: 0.32, r: 0.2, shape: 'card' },
    { x: 0.82, y: 0.12, r: -0.1, shape: 'disk' },
  ] satisfies Array<{ x: number; y: number; r: number; shape: 'circle' | 'card' | 'disk' | 'ticket' | 'dot' }>;
  placements.forEach((placement, index) => {
    const cutout = makeCutout(placement.shape, palette[index]!);
    cutout.backing.name = `collage-backing-${index}`;
    cutout.artwork.name = `collage-piece-${index}`;
    const layerZ = index * 0.025;
    cutout.backing.position.set(placement.x, placement.y, layerZ);
    cutout.artwork.position.set(placement.x, placement.y, layerZ + 0.024);
    cutout.backing.rotation.z = placement.r;
    cutout.artwork.rotation.z = placement.r;
    cutout.backing.castShadow = true;
    cutout.artwork.castShadow = true;
    group.add(cutout.backing, cutout.artwork);
    parts.set(cutout.backing.name, cutout.backing);
    parts.set(cutout.artwork.name, cutout.artwork);
  });
}

export function createDirectoryFolderModel(category: Category, variant: CollageVariant, reducedMotion = false): SculptModelHandle {
  const root = new THREE.Group();
  root.name = `directory-folder-${category.id}`;
  const parts = new Map<string, THREE.Object3D>([['root', root]]);
  const targets: THREE.Object3D[] = [];
  root.userData.reducedMotion = reducedMotion;
  const timelines = createTimelineController({ reducedMotion: () => root.userData.reducedMotion === true });

  const rearPocket = makeExtrudedMesh(directoryRearShape(), category.color, 0.055, 0.022);
  rearPocket.name = 'rear-pocket';
  rearPocket.position.set(0, 0, -0.04);
  root.add(rearPocket);
  parts.set(rearPocket.name, rearPocket);
  parts.set('rear-tab', rearPocket);

  const internalLip = makeExtrudedMesh(
    roundedRectShape(FOLDER_WIDTH - 0.16, 0.28, 0.11),
    mixColor(category.color, '#172033', 0.22),
    0.032,
    0.012,
  );
  internalLip.name = 'internal-lip';
  internalLip.position.set(0, 0.35, 0.028);
  root.add(internalLip);
  parts.set(internalLip.name, internalLip);

  const collageRoot = new THREE.Group();
  collageRoot.name = 'collage-root';
  collageRoot.position.set(0, 0.48, 0.04);
  addCollage(collageRoot, parts, variant);
  root.add(collageRoot);
  parts.set(collageRoot.name, collageRoot);

  const pocketHinge = new THREE.Group();
  pocketHinge.name = 'front-pocket-hinge';
  pocketHinge.position.set(0, BOTTOM_SEAM_Y, 0.06);
  root.add(pocketHinge);
  parts.set(pocketHinge.name, pocketHinge);

  const frontPocket = makeExtrudedMesh(
    roundedRectShape(FOLDER_WIDTH, FRONT_HEIGHT, 0.25),
    mixColor(category.color, '#F4FFF5', 0.24),
    0.065,
    0.024,
  );
  frontPocket.name = 'front-pocket';
  frontPocket.position.y = FRONT_HEIGHT / 2;
  frontPocket.userData.action = 'open-category';
  frontPocket.userData.categoryId = category.id;
  pocketHinge.add(frontPocket);
  parts.set(frontPocket.name, frontPocket);
  targets.push(frontPocket);

  const outsideLabel = makeTextPanel(2.45, 0.48, 0.035, {
    title: category.title.en,
    subtitle: category.title.zh,
    background: '#2B8AF0',
    foreground: '#FFF9E7',
    align: 'center',
    width: 950,
    height: 260,
    titleScale: 0.16,
    subtitleScale: 0.055,
    transparentBackground: true,
  });
  outsideLabel.name = 'outside-label';
  outsideLabel.position.set(0, BOTTOM_SEAM_Y - 0.2, 0.02);
  root.add(outsideLabel);
  parts.set(outsideLabel.name, outsideLabel);

  root.userData.hovered = false;
  root.userData.opened = false;
  const handle = createHandle(root, parts, targets, {
    setHovered: (hovered) => { root.userData.hovered = hovered; },
    open: () => {
      root.userData.opened = true;
      return timelines.run((timeline) => {
      timeline
        .to(pocketHinge.rotation, { x: 1.18, duration: 0.62, ease: 'back.inOut(1.1)' }, 0)
        .to(collageRoot.position, { y: 0.78, z: 0.055, duration: 0.46, ease: 'power2.out' }, 0.08)
        .to(collageRoot.scale, { x: 1.055, y: 1.055, duration: 0.42, ease: 'power2.out' }, 0.08);
      });
    },
    close: () => timelines.run((timeline) => {
      timeline
        .to(pocketHinge.rotation, { x: 0, duration: 0.46, ease: 'power3.inOut' }, 0)
        .to(collageRoot.position, { y: 0.48, z: 0.04, duration: 0.38 }, 0)
        .to(collageRoot.scale, { x: 1, y: 1, duration: 0.35 }, 0);
    }).finally(() => { root.userData.opened = false; }),
  }, (delta) => {
    const hover = root.userData.hovered && root.userData.reducedMotion !== true ? 1 : 0;
    const pointer = root.userData.hoverPointer ?? { x: 0, y: 0 };
    if (!root.userData.opened) {
      const pointerY = THREE.MathUtils.clamp(Number(pointer.y) || 0, -1, 1);
      const hoverAngle = 0.38 + pointerY * 0.06;
      pocketHinge.rotation.x = damp(pocketHinge.rotation.x, hover ? hoverAngle : 0, 10, delta);
      collageRoot.position.y = damp(collageRoot.position.y, hover ? 0.57 : 0.48, 9, delta);
      collageRoot.position.z = damp(collageRoot.position.z, hover ? 0.048 : 0.04, 9, delta);
    }
  });
  const baseDispose = handle.dispose;
  handle.dispose = () => {
    timelines.killActiveTimeline();
    baseDispose();
  };
  return handle;
}
