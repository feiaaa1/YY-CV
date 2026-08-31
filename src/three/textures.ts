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
  transparentBackground?: boolean;
};

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

  const width = options.width ?? 1024;
  const height = options.height ?? 640;
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
    context.font = `700 ${Math.round(height * (options.kickerScale ?? 0.055))}px ${options.mono ? 'monospace' : 'Arial, sans-serif'}`;
    context.fillText(options.kicker.toUpperCase(), x, height * 0.18);
  }

  context.fillStyle = options.foreground ?? '#171923';
  context.font = `800 ${Math.round(height * (options.titleScale ?? 0.13))}px ${options.mono ? 'monospace' : 'Arial, "PingFang SC", sans-serif'}`;
  const maxWidth = width * 0.82;
  const title = truncateMeasuredText(options.title, maxWidth, (value) => context.measureText(value).width);
  context.fillText(title, x, height * 0.43);

  if (options.subtitle) {
    context.font = `500 ${Math.round(height * (options.subtitleScale ?? 0.048))}px ${options.mono ? 'monospace' : 'Arial, "PingFang SC", sans-serif'}`;
    context.fillStyle = options.foreground ?? '#30323B';
    const lines = wrapMeasuredText(options.subtitle, maxWidth, (value) => context.measureText(value).width, 3);
    lines.forEach((value, index) => context.fillText(value, x, height * (0.63 + index * 0.075)));
  }

  context.fillStyle = options.accent ?? '#F0C94D';
  context.fillRect(width * 0.09, height * 0.88, width * 0.18, Math.max(5, height * 0.012));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
