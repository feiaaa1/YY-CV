import * as THREE from 'three';
import { truncateMeasuredText, wrapMeasuredText } from './textLayout';

export type TextTextureOptions = {
  width?: number;
  height?: number;
  background?: string;
  foreground?: string;
  accent?: string;
  title: string;
  subtitle?: string;
  kicker?: string;
  align?: CanvasTextAlign;
  mono?: boolean;
  titleScale?: number;
  subtitleScale?: number;
  kickerScale?: number;
  /** Vertical center of the title line, as a share of the canvas height. */
  titleY?: number;
  /** Vertical center of the first subtitle line, as a share of the canvas height. */
  subtitleY?: number;
  /** Maximum subtitle lines before the text is elided. */
  subtitleLines?: number;
  transparentBackground?: boolean;
};

/**
 * Text panels are printed straight onto a face whose world size is known, so
 * their canvas is sized from that size and the display density instead of an
 * arbitrary pixel count. One authored texel per device pixel is what keeps
 * glyph edges intact; the ceiling stops a full-width banner from allocating a
 * texture no phone could hold.
 */
export const TEXT_TEXELS_PER_WORLD_UNIT = 224;
export const TEXT_TEXTURE_MAX_PIXELS = 1_800_000;

const CJK_FALLBACK_FONTS = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", sans-serif';

/** Display density the paper is measured against, capped at a 2x panel. */
export function textTextureDensity(devicePixelRatio: number): number {
  const device = Number.isFinite(devicePixelRatio) ? Math.max(1, Math.min(devicePixelRatio, 2)) : 1;
  return TEXT_TEXELS_PER_WORLD_UNIT * device;
}

export function textCanvasSize(
  worldWidth: number,
  worldHeight: number,
  devicePixelRatio = 1,
): { width: number; height: number } {
  const density = textTextureDensity(devicePixelRatio);
  let width = Math.max(0.08, worldWidth) * density;
  let height = Math.max(0.08, worldHeight) * density;
  const budget = Math.sqrt(TEXT_TEXTURE_MAX_PIXELS / (width * height));
  if (budget < 1) {
    width *= budget;
    height *= budget;
  }
  return { width: Math.max(64, Math.round(width)), height: Math.max(64, Math.round(height)) };
}

export function configureTextTexture(texture: THREE.Texture): THREE.Texture {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  // Trilinear minification plus anisotropy is what keeps small text from
  // shimmering when the panel is tilted or minified inside the scene.
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

function fallbackTexture(color: string): THREE.DataTexture {
  const parsed = new THREE.Color(color);
  const data = new Uint8Array([Math.round(parsed.r * 255), Math.round(parsed.g * 255), Math.round(parsed.b * 255), 255]);
  const texture = new THREE.DataTexture(data, 1, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createTextTexture(options: TextTextureOptions): THREE.Texture {
  const background = options.background ?? '#FFF9EC';
  if (typeof document === 'undefined') return fallbackTexture(background);

  const width = Math.max(1, Math.round(options.width ?? 1024));
  const height = Math.max(1, Math.round(options.height ?? 640));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return fallbackTexture(background);

  if (!options.transparentBackground) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  } else context.clearRect(0, 0, width, height);
  context.textAlign = options.align ?? 'left';
  context.textBaseline = 'middle';
  const x = context.textAlign === 'center' ? width / 2 : width * 0.09;

  if (options.kicker) {
    context.fillStyle = options.accent ?? '#F0C94D';
    context.font = `700 ${Math.round(height * (options.kickerScale ?? 0.055))}px ${options.mono ? 'monospace' : `Arial, ${CJK_FALLBACK_FONTS}`}`;
    context.fillText(options.kicker.toUpperCase(), x, height * 0.18);
  }

  context.fillStyle = options.foreground ?? '#171923';
  context.font = `800 ${Math.round(height * (options.titleScale ?? 0.13))}px ${options.mono ? 'monospace' : `Arial, ${CJK_FALLBACK_FONTS}`}`;
  const maxWidth = width * 0.82;
  const title = truncateMeasuredText(options.title, maxWidth, (value) => context.measureText(value).width);
  context.fillText(title, Math.round(x), Math.round(height * (options.titleY ?? 0.43)));

  if (options.subtitle) {
    context.font = `500 ${Math.round(height * (options.subtitleScale ?? 0.048))}px ${options.mono ? 'monospace' : `Arial, ${CJK_FALLBACK_FONTS}`}`;
    context.fillStyle = options.foreground ?? '#30323B';
    const lines = wrapMeasuredText(
      options.subtitle,
      maxWidth,
      (value) => context.measureText(value).width,
      Math.max(1, Math.round(options.subtitleLines ?? 3)),
    );
    const subtitleY = options.subtitleY ?? 0.63;
    const lineStep = Math.max((options.subtitleScale ?? 0.048) * 1.35, 0.075);
    lines.forEach((value, index) => (
      context.fillText(value, Math.round(x), Math.round(height * (subtitleY + index * lineStep)))
    ));
  }

  context.fillStyle = options.accent ?? '#F0C94D';
  context.fillRect(width * 0.09, height * 0.88, width * 0.18, Math.max(5, height * 0.012));

  const texture = new THREE.CanvasTexture(canvas);
  return configureTextTexture(texture);
}
