import * as THREE from 'three';

export type ReferenceTextLayer = {
  id: string;
  kind: 'text';
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  font: string;
  align?: CanvasTextAlign;
  tracking?: number;
  rotate?: number;
  opacity?: number;
};

export type ReferenceRuleLayer = {
  id: string;
  kind: 'rule';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export type ReferenceGraphic = {
  width: number;
  height: number;
  background: string;
  layers: Array<ReferenceTextLayer | ReferenceRuleLayer>;
};

const yellow = '#F7D35F';
const cream = '#FFF8E9';

export const coverGraphic: ReferenceGraphic = {
  width: 2048,
  height: 1152,
  background: '#2B8AF0',
  layers: [
    { id: 'portfolio-title', kind: 'text', text: 'PORTFOLIO', x: 0.5, y: 0.17, size: 0.205, color: yellow, font: '300 1px Arial Narrow, Arial, sans-serif', align: 'center', tracking: -0.012 },
    { id: 'year', kind: 'text', text: '2024', x: 0.16, y: 0.265, size: 0.07, color: cream, font: 'italic 300 1px Georgia, serif', align: 'center' },
    { id: 'script-title', kind: 'text', text: 'Graphic Design', x: 0.79, y: 0.26, size: 0.067, color: cream, font: 'italic 300 1px Georgia, serif', align: 'center' },
    { id: 'left-contact', kind: 'text', text: '求职者 七米\nBRAND DESIGN\n● 品牌设计', x: 0.03, y: 0.82, size: 0.027, color: cream, font: '700 1px Arial, sans-serif' },
    { id: 'right-contact', kind: 'text', text: '手机号183xxxxxxxx\nVISUAL DESIGN\n● 视觉设计\n\n微信号ABCDEFG\nGRAPHIC DESIGN', x: 0.82, y: 0.67, size: 0.025, color: cream, font: '700 1px Arial, sans-serif' },
    { id: 'bottom-rail', kind: 'rule', x: 0.025, y: 0.955, width: 0.95, height: 0.025, color: yellow },
  ],
};

export const thanksGraphic: ReferenceGraphic = {
  width: 2048,
  height: 1152,
  background: '#2B8AF0',
  layers: [
    { id: 'thank-you-title', kind: 'text', text: 'THANK YOU', x: 0.5, y: 0.17, size: 0.2, color: yellow, font: '300 1px Arial Narrow, Arial, sans-serif', align: 'center', tracking: -0.016 },
    { id: 'year', kind: 'text', text: '2024', x: 0.16, y: 0.27, size: 0.068, color: cream, font: 'italic 300 1px Georgia, serif', align: 'center' },
    { id: 'script-title', kind: 'text', text: 'Graphic Design', x: 0.78, y: 0.26, size: 0.064, color: cream, font: 'italic 300 1px Georgia, serif', align: 'center' },
    { id: 'message', kind: 'text', text: '感谢观看\nThank you\nTHANKS FOR WATCHING', x: 0.55, y: 0.66, size: 0.032, color: yellow, font: '700 1px Arial, sans-serif', align: 'center' },
    { id: 'contact-line', kind: 'text', text: 'PLEASE contact me', x: 0.03, y: 0.88, size: 0.057, color: cream, font: '400 1px Arial, sans-serif' },
    { id: 'bottom-rail', kind: 'rule', x: 0.025, y: 0.955, width: 0.95, height: 0.025, color: yellow },
  ],
};

function fallbackTexture(color: string): THREE.DataTexture {
  const parsed = new THREE.Color(color);
  const data = new Uint8Array([parsed.r * 255, parsed.g * 255, parsed.b * 255, 255]);
  const texture = new THREE.DataTexture(data, 1, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function drawTrackedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number): void {
  if (!tracking) {
    context.fillText(text, x, y);
    return;
  }
  const widths = [...text].map((character) => context.measureText(character).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + tracking * (text.length - 1);
  let cursor = context.textAlign === 'center' ? x - total / 2 : x;
  for (const [index, character] of [...text].entries()) {
    context.fillText(character, cursor, y);
    cursor += widths[index]! + tracking;
  }
}

export function createReferenceTexture(graphic: ReferenceGraphic): THREE.Texture {
  if (typeof document === 'undefined') return fallbackTexture(graphic.background);
  const canvas = document.createElement('canvas');
  canvas.width = graphic.width;
  canvas.height = graphic.height;
  const context = canvas.getContext('2d');
  if (!context) return fallbackTexture(graphic.background);
  context.fillStyle = graphic.background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (const layer of graphic.layers) {
    if (layer.kind === 'rule') {
      context.fillStyle = layer.color;
      context.fillRect(layer.x * canvas.width, layer.y * canvas.height, layer.width * canvas.width, layer.height * canvas.height);
      continue;
    }
    context.save();
    context.globalAlpha = layer.opacity ?? 1;
    context.fillStyle = layer.color;
    context.textAlign = layer.align ?? 'left';
    context.textBaseline = 'middle';
    context.font = layer.font.replace('1px', `${Math.round(layer.size * canvas.height)}px`);
    const x = layer.x * canvas.width;
    const y = layer.y * canvas.height;
    context.translate(x, y);
    context.rotate(layer.rotate ?? 0);
    layer.text.split('\n').forEach((line, index, lines) => {
      drawTrackedText(context, line, 0, (index - (lines.length - 1) / 2) * layer.size * canvas.height * 1.08, (layer.tracking ?? 0) * canvas.width);
    });
    context.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
