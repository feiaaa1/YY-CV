import * as THREE from 'three';
import { getLoadedImageAsset, loadImageAsset } from '../performance/imageAssets';
import { makeActionChip } from '../three/geometry';

/**
 * The directory's two top controls are supplied artwork rather than typeset
 * text: the yellow "作品目录 / 选择分类" sticker and the pink
 * "完成浏览 / 查看致谢" button. They are stored pre-trimmed and transparent so
 * the 3D plane only carries the drawn button, decorations included.
 */
export const directoryTitleStickerUrl = '/assets/directory/controls/directory-title.webp';
export const finishBrowsingStickerUrl = '/assets/directory/controls/finish-browsing.webp';

export const directoryControlAssetUrls = [
  directoryTitleStickerUrl,
  finishBrowsingStickerUrl,
] as const;

/** Trimmed aspect (width / height) of `directory-title.webp`, 1024 × 360. */
const DIRECTORY_TITLE_ASPECT = 1024 / 360;
/** Trimmed aspect (width / height) of `finish-browsing.webp`, 1024 × 333. */
const FINISH_BROWSING_ASPECT = 1024 / 333;

/**
 * World-space widths. They land just above the old text chips' widths so the
 * lettering keeps its previous reading size once the artwork's own margin is
 * taken into account, without the stickers growing past the layout anchors.
 */
export const directoryTitleControlWidth = 1.95;
export const finishBrowsingControlWidth = 2.35;

type ControlFallback = {
  width: number;
  title: string;
  hint?: string;
  background: string;
  foreground: string;
};

type StickerControlOptions = {
  name: string;
  source: string;
  aspect: number;
  width: number;
  /** Drawn until the sticker resolves, and kept if it never does. */
  fallback: ControlFallback;
  action?: string;
};

/**
 * A control is a group so the caller keeps positioning, scaling and hit-testing
 * it the way it did the chip. Only one of the two children is ever visible: the
 * chip is the safety net for a missing image, and it steps aside once the
 * sticker's texture is ready.
 */
function createStickerControl(options: StickerControlOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = options.name;
  if (options.action) group.userData.action = options.action;

  const fallback = makeActionChip(options.fallback.width, {
    title: options.fallback.title,
    hint: options.fallback.hint,
    background: options.fallback.background,
    foreground: options.fallback.foreground,
  });
  fallback.name = `${options.name}-fallback`;
  group.add(fallback);

  // The texture starts empty so the sticker can be laid out before its image
  // arrives, and only turns visible once there is something to draw.
  const texture = new THREE.Texture();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  const sticker = new THREE.Mesh(
    new THREE.PlaneGeometry(options.width, options.width / options.aspect),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  sticker.name = `${options.name}-sticker`;
  sticker.renderOrder = 3;
  sticker.visible = false;
  group.add(sticker);

  const applyImage = (image: HTMLImageElement): void => {
    if (group.userData.disposed === true) return;
    texture.image = image;
    texture.needsUpdate = true;
    sticker.visible = true;
    fallback.visible = false;
  };
  const cached = getLoadedImageAsset(options.source);
  if (cached) applyImage(cached);
  else void loadImageAsset(options.source, 'high').then(applyImage).catch(() => undefined);

  return group;
}

/** "作品目录 / 选择分类": the label that names the directory screen. */
export function createDirectoryTitleControl(): THREE.Group {
  return createStickerControl({
    name: 'directory-header',
    source: directoryTitleStickerUrl,
    aspect: DIRECTORY_TITLE_ASPECT,
    width: directoryTitleControlWidth,
    fallback: {
      width: 1.6,
      title: '作品目录',
      hint: '选择分类',
      background: '#F4EF62',
      foreground: '#17213A',
    },
  });
}

/** "完成浏览 / 查看致谢": the control that leaves the directory. */
export function createFinishBrowsingControl(): THREE.Group {
  return createStickerControl({
    name: 'finish-tag',
    source: finishBrowsingStickerUrl,
    aspect: FINISH_BROWSING_ASPECT,
    width: finishBrowsingControlWidth,
    action: 'finish',
    fallback: {
      width: 2.1,
      title: '完成浏览',
      hint: '查看致谢',
      background: '#EFFF69',
      foreground: '#17213A',
    },
  });
}
