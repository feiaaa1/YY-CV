import * as THREE from 'three';
import type { Category } from '../content/types';
import { createTimelineController } from '../animation/timelines';
import { makeExtrudedMesh, makeTextPanel, roundedRectShape } from '../three/geometry';
import { createHandle, damp, type SculptModelHandle } from '../three/runtime';
import { getLoadedImageAsset } from '../performance/imageAssets';

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
// Keep the stickers readable without letting the cluster escape the pocket.
const STICKER_MAX_SIZE = FOLDER_WIDTH * 0.3 * 1.1;
const STICKER_VERTICAL_OFFSET = 0.16;
const COLLAGE_REST_Z = 0.075;

type StickerAsset = { file: string; width: number; height: number; scale: number };

const brandStickers: StickerAsset[] = [
  { file: 'reader_king_of_the_book_hill.webp', width: 320, height: 294, scale: 1.08 },
  { file: 'russian_cute_flower.webp', width: 252, height: 258, scale: 0.82 },
  { file: 'duoduo_come_on.webp', width: 458, height: 267, scale: 1.16 },
  { file: 'uplift_each_other.webp', width: 799, height: 1560, scale: 0.94 },
  { file: 'retro_boombox.webp', width: 190, height: 155, scale: 0.76 },
] as const;

const uiWebStickers: StickerAsset[] = [
  { file: 'retro_boombox.webp', width: 190, height: 155, scale: 0.78 },
  { file: 'reader_stellar_start.webp', width: 234, height: 325, scale: 1.02 },
  { file: 'russian_thinking_blob.webp', width: 276, height: 247, scale: 0.88 },
  { file: 'duoduo_power_duoduo.webp', width: 460, height: 267, scale: 1.12 },
  { file: 'presentation_ribbon.webp', width: 299, height: 212, scale: 0.9 },
  { file: 'retro_eye_heart.webp', width: 164, height: 144, scale: 0.76 },
];

const posterStickers: StickerAsset[] = [
  { file: 'reader_monster_reader.webp', width: 234, height: 211, scale: 1.02 },
  { file: 'duoduo_birthday.webp', width: 464, height: 266, scale: 1.14 },
  { file: 'russian_good_vibes.webp', width: 154, height: 215, scale: 0.84 },
  { file: 'productivity_pencil.webp', width: 200, height: 142, scale: 0.92 },
  { file: 'retro_lightning.webp', width: 95, height: 110, scale: 0.76 },
];

const illustrationStickers: StickerAsset[] = [
  { file: 'reader_bedtime_reader.webp', width: 303, height: 213, scale: 1 },
  { file: 'duoduo_love_duoduo.webp', width: 461, height: 280, scale: 1.1 },
  { file: 'russian_deal_hands.webp', width: 199, height: 218, scale: 0.86 },
  { file: 'productivity_green_arrow.webp', width: 1135, height: 1021, scale: 0.96 },
  { file: 'retro_tv_face.webp', width: 184, height: 127, scale: 0.8 },
];

const projectStickers: StickerAsset[] = [
  { file: 'productivity_teamwork_badge.webp', width: 1920, height: 1920, scale: 0.84 },
  { file: 'russian_coffee.webp', width: 221, height: 203, scale: 0.82 },
  { file: 'retro_record_player.webp', width: 170, height: 144, scale: 0.78 },
  { file: 'reader_fantastic_dinosaur.webp', width: 314, height: 297, scale: 1 },
  { file: 'duoduo_full_marks.webp', width: 464, height: 286, scale: 0.85 },
];

const stickerSets: Array<[string, readonly StickerAsset[]]> = [
  ['brand-stickers', brandStickers],
  ['ui-web-stickers', uiWebStickers],
  ['poster-stickers', posterStickers],
  ['illustration-stickers', illustrationStickers],
  ['project-stickers', projectStickers],
];

export const directoryStickerAssetUrls = stickerSets.flatMap(([directory, stickers]) => (
  stickers.map((sticker) => `/assets/directory/${directory}/${sticker.file}`)
));

function mixColor(color: string, target: string, amount: number): string {
  return `#${new THREE.Color(color).lerp(new THREE.Color(target), amount).getHexString()}`;
}

function directoryRearShape(): THREE.Shape {
  const left = -FOLDER_WIDTH / 2;
  const right = FOLDER_WIDTH / 2;
  const bottom = -REAR_BODY_HEIGHT / 2;
  const top = REAR_BODY_HEIGHT / 2;
  const radius = 0.23;
  // The tab shoulder must end before the body's upper-left corner begins.
  // Otherwise the outline doubles back and its bevel produces a left spike.
  const tabLeft = left + radius + 0.13 + 0.08;
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
    const backingGeometry = new THREE.CylinderGeometry(radius + 0.055, radius + 0.055, 0.006, sides);
    const artworkGeometry = new THREE.CylinderGeometry(radius, radius, 0.004, sides);
    backingGeometry.rotateX(Math.PI / 2);
    artworkGeometry.rotateX(Math.PI / 2);
    const backing = new THREE.Mesh(
      backingGeometry,
      new THREE.MeshStandardMaterial({ color: '#FFFDF5', roughness: 0.92 }),
    );
    const artwork = new THREE.Mesh(
      artworkGeometry,
      new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
    );
    return { backing, artwork };
  }

  const height = shape === 'ticket' ? 0.76 : 0.62;
  return {
    backing: makeExtrudedMesh(roundedRectShape(0.62, height + 0.08, 0.09), '#FFFDF5', 0.006, 0),
    artwork: makeExtrudedMesh(roundedRectShape(0.53, height - 0.02, 0.065), color, 0.004, 0),
  };
}

function addCollage(group: THREE.Group, parts: Map<string, THREE.Object3D>, variant: CollageVariant): void {
  const palette = collagePalettes[variant];
  const placements = [
    { x: -0.87, y: 0.09, r: -0.2, shape: 'card' },
    { x: -0.43, y: 0.31, r: 0.12, shape: 'ticket' },
    { x: 0.02, y: 0.14, r: -0.12, shape: 'dot' },
    { x: 0.43, y: 0.33, r: 0.18, shape: 'card' },
    { x: 0.91, y: 0.11, r: -0.1, shape: 'disk' },
  ] satisfies Array<{ x: number; y: number; r: number; shape: 'circle' | 'card' | 'disk' | 'ticket' | 'dot' }>;
  placements.forEach((placement, index) => {
    const cutout = makeCutout(placement.shape, palette[index]!);
    cutout.backing.name = `collage-backing-${index}`;
    cutout.artwork.name = `collage-piece-${index}`;
    const layerZ = index * 0.006;
    cutout.backing.position.set(placement.x, placement.y, layerZ);
    cutout.artwork.position.set(placement.x, placement.y, layerZ + 0.005);
    cutout.backing.rotation.z = placement.r;
    cutout.artwork.rotation.z = placement.r;
    cutout.backing.castShadow = true;
    cutout.artwork.castShadow = true;
    group.add(cutout.backing, cutout.artwork);
    parts.set(cutout.backing.name, cutout.backing);
    parts.set(cutout.artwork.name, cutout.artwork);
  });
}

function addStickerCollage(group: THREE.Group, parts: Map<string, THREE.Object3D>, assets: StickerAsset[], directory: string): void {
  const xPositions = assets.length === 6 ? [-0.82, -0.5, -0.16, 0.18, 0.5, 0.82] : [-0.77, -0.38, 0.02, 0.42, 0.84];
  const yPositions = assets.length === 6 ? [-0.11, 0.16, -0.04, 0.19, -0.09, 0.14] : [-0.11, 0.16, -0.04, 0.19, -0.09];
  const rotations = assets.length === 6 ? [-0.22, 0.17, -0.06, 0.13, -0.15, 0.2] : [-0.22, 0.17, -0.06, 0.13, -0.15];

  assets.forEach((sticker, index) => {
    const aspect = sticker.width / sticker.height;
    const maxSize = STICKER_MAX_SIZE * sticker.scale;
    const width = aspect >= 1 ? maxSize : maxSize * aspect;
    const height = aspect >= 1 ? maxSize / aspect : maxSize;
    const source = `/assets/directory/${directory}/${sticker.file}`;
    const cachedImage = getLoadedImageAsset(source);
    const texture = cachedImage
      ? new THREE.Texture(cachedImage)
      : typeof document === 'undefined'
        ? null
        : new THREE.TextureLoader().load(source);
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: texture ? '#FFFFFF' : '#F7F2E8',
      transparent: true,
      alphaTest: 0.025,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const piece = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    piece.name = `collage-piece-${index}`;
    piece.position.set(
      xPositions[index]!,
      yPositions[index]! + STICKER_VERTICAL_OFFSET,
      0.002 + index * 0.0015,
    );
    piece.rotation.z = rotations[index]!;
    piece.renderOrder = 2 + index;
    piece.userData.stickerSource = sticker.file;
    piece.userData.normalizedSize = maxSize;
    group.add(piece);
    parts.set(piece.name, piece);
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
  // The collage sits in the pocket: ahead of the rear shell, behind the front face.
  collageRoot.position.set(0, 0.44, COLLAGE_REST_Z);
  if (variant === 'sport') addStickerCollage(collageRoot, parts, brandStickers, 'brand-stickers');
  else if (variant === 'business') addStickerCollage(collageRoot, parts, uiWebStickers, 'ui-web-stickers');
  else if (variant === 'technology') addStickerCollage(collageRoot, parts, posterStickers, 'poster-stickers');
  else if (variant === 'culture') addStickerCollage(collageRoot, parts, illustrationStickers, 'illustration-stickers');
  else if (variant === 'cinema') addStickerCollage(collageRoot, parts, projectStickers, 'project-stickers');
  else addCollage(collageRoot, parts, variant);
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

  // One line names each folder: the second, smaller row that used to sit under
  // it only repeated the category and turns to mush at phone sizes. The line
  // stays centred in the panel so the caption keeps the same footprint.
  // Texture aspect matches the panel so the glyphs keep their true
  // proportions.
  const outsideLabel = makeTextPanel(2.5, 0.66, 0.035, {
    title: category.description.zh,
    background: '#2B8AF0',
    foreground: '#FFF9E7',
    align: 'center',
    width: 1250,
    height: 330,
    titleScale: 0.3,
    titleY: 0.42,
    transparentBackground: true,
  });
  outsideLabel.name = 'outside-label';
  // Hug the folder: the caption reads as the folder's own name instead of
  // drifting into the row underneath.
  outsideLabel.position.set(0, BOTTOM_SEAM_Y - 0.05 - 0.25, 0.02);
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
        .to(collageRoot.position, {
          y: 0.78,
          z: COLLAGE_REST_Z + 0.015,
          duration: 0.46,
          ease: 'power2.out',
        }, 0.08)
        .to(collageRoot.scale, { x: 1.055, y: 1.055, duration: 0.42, ease: 'power2.out' }, 0.08);
      });
    },
    close: () => timelines.run((timeline) => {
      timeline
        .to(pocketHinge.rotation, { x: 0, duration: 0.46, ease: 'power3.inOut' }, 0)
        .to(collageRoot.position, { y: 0.44, z: COLLAGE_REST_Z, duration: 0.38 }, 0)
        .to(collageRoot.scale, { x: 1, y: 1, duration: 0.35 }, 0);
    }).finally(() => { root.userData.opened = false; }),
  }, (delta) => {
    const hover = root.userData.hovered && root.userData.reducedMotion !== true ? 1 : 0;
    const pointer = root.userData.hoverPointer ?? { x: 0, y: 0 };
    if (!root.userData.opened) {
      const pointerY = THREE.MathUtils.clamp(Number(pointer.y) || 0, -1, 1);
      const hoverAngle = 0.38 + pointerY * 0.06;
      pocketHinge.rotation.x = damp(pocketHinge.rotation.x, hover ? hoverAngle : 0, 10, delta);
      const baseY = 0.44;
      collageRoot.position.y = damp(collageRoot.position.y, hover ? baseY + 0.09 : baseY, 9, delta);
      collageRoot.position.z = damp(collageRoot.position.z, COLLAGE_REST_Z, 9, delta);
    }
  });
  const baseDispose = handle.dispose;
  handle.dispose = () => {
    timelines.killActiveTimeline();
    baseDispose();
  };
  return handle;
}
