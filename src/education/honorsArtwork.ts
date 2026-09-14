import * as THREE from 'three';
import type { ScrapbookPage } from '../content/types';
import { damp } from '../three/runtime';

const directory = '/assets/education/page-2/';
const artworkSize = { width: 1200, height: 1420 };

type HonorsSticker = {
  id: string;
  label: string;
  file: string;
  box: [number, number, number, number];
};

export const honorsStickers: HonorsSticker[] = [
  { id: 'title', label: '成长与积累', file: 'title.png', box: [.06, .098, .46, .096] },
  { id: 'small-steps', label: 'Small Steps, Big Changes.', file: 'small-steps.png', box: [.67, .055, .285, .14] },
  { id: 'award-01', label: '第九届“互联网+”创新创业大赛天津赛区铜奖', file: 'award-01.png', box: [.06, .315, .88, .075] },
  { id: 'award-02', label: '天津市公益广告大赛二等奖', file: 'award-02.png', box: [.06, .425, .88, .075] },
  { id: 'award-03', label: '“讲好文物历史故事”视频大赛一等奖', file: 'award-03.png', box: [.06, .535, .88, .075] },
  { id: 'award-04', label: '天津市“中广视讯杯”视频大赛三等奖', file: 'award-04.png', box: [.06, .645, .88, .075] },
  { id: 'award-05', label: '天津市思想政治理论公开课大赛一等奖', file: 'award-05.png', box: [.06, .755, .88, .075] },
];

const images = new Map<string, HTMLImageElement>();
let loading: Promise<void> | undefined;

export function hasHonorsArtwork(page: ScrapbookPage): boolean {
  return page.education?.experience.id === 'renai' && page.education.continuation === 0;
}

export function loadHonorsArtwork(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  loading ??= Promise.all(honorsStickers.map((sticker) => new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => { images.set(sticker.file, image); resolve(); };
    image.onerror = () => reject(new Error(`Unable to load honors artwork: ${sticker.file}`));
    image.src = `${directory}${sticker.file}`;
  }))).then(() => undefined).catch((error: unknown) => { loading = undefined; throw error; });
  return loading;
}

function drawWavyRule(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
  ctx.save();
  ctx.strokeStyle = '#10150D';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let offset = 0; offset <= width; offset += 12) {
    const nextX = x + offset;
    const nextY = y + Math.sin(offset / 12 * Math.PI) * 5;
    if (offset === 0) ctx.moveTo(nextX, nextY); else ctx.lineTo(nextX, nextY);
  }
  ctx.stroke();
  ctx.restore();
}

/** Rebuilds the supplied green paper background at the print resolution. */
export function paintHonorsBackground(ctx: CanvasRenderingContext2D): void {
  const { width, height } = artworkSize;
  const wash = ctx.createRadialGradient(width * .48, height * .42, 40, width * .48, height * .42, width * .82);
  wash.addColorStop(0, '#D9EDA0');
  wash.addColorStop(.65, '#C7DD83');
  wash.addColorStop(1, '#A6C764');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  // Printed-paper fibres and scuffs, positioned deterministically to keep page turns stable.
  for (let index = 0; index < 620; index += 1) {
    const x = (index * 113) % width;
    const y = (index * 71) % height;
    const length = 5 + (index * 19) % 66;
    ctx.strokeStyle = index % 3 === 0 ? 'rgba(255,255,235,.15)' : 'rgba(65,90,26,.07)';
    ctx.lineWidth = index % 11 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y + ((index % 5) - 2) * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,238,.78)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(5, 5, width - 10, height - 10, 28); ctx.stroke();

  ctx.fillStyle = '#12170E';
  ctx.font = '500 30px Arial, "PingFang SC", sans-serif';
  ctx.fillText('EXPERIENCE & ACHIEVEMENTS', 93, 124);
  ctx.font = '900 62px "Arial Black", "PingFang SC", sans-serif';
  ctx.fillText('所获奖项', 96, 346);
  drawWavyRule(ctx, 365, 325, 260);

  ctx.textAlign = 'center';
  ctx.font = '700 31px Arial, sans-serif';
  ['WHAT', 'I HAVE', 'GAINED.'].forEach((line, index) => ctx.fillText(line, 1010, 280 + index * 38));
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(952, 388); ctx.lineTo(1068, 388); ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = 'italic 36px Georgia, "KaiTi", serif';
  ctx.fillText('Learning', 90, 1240);
  ctx.fillText('Shines a Brighter Me.', 90, 1282);
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(95, 1295); ctx.lineTo(450, 1248); ctx.stroke();

  ctx.save();
  ctx.translate(925, 1242);
  ctx.strokeStyle = '#151a11'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, 0, 76, 58, -.12, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, 68, 50, -.12, 0, Math.PI * 2); ctx.stroke();
  ctx.textAlign = 'center'; ctx.font = '700 29px Arial, sans-serif';
  ctx.fillText('2021', 0, -5); ctx.fillText('— 2025', 0, 29);
  [0, 1, 2].forEach((line) => { ctx.beginPath(); ctx.moveTo(67, -23 + line * 22); ctx.bezierCurveTo(106, -47 + line * 22, 120, -5 + line * 22, 166, -27 + line * 22); ctx.stroke(); });
  ctx.restore();
  ctx.textAlign = 'left'; ctx.font = '700 28px Arial, sans-serif'; ctx.fillText('02', 1085, 1340);
}

export function paintHonorsArtwork(ctx: CanvasRenderingContext2D, flatten: boolean): boolean {
  paintHonorsBackground(ctx);
  if (!flatten) return true;
  for (const sticker of honorsStickers) {
    const image = images.get(sticker.file);
    if (!image) return false;
    const [x, y, width, height] = sticker.box;
    ctx.drawImage(image, x * artworkSize.width, y * artworkSize.height, width * artworkSize.width, height * artworkSize.height);
  }
  return true;
}

export function createHonorsStickerLayers() {
  const group = new THREE.Group();
  group.name = 'honors-stickers';
  const meshes = honorsStickers.map((sticker) => {
    const image = images.get(sticker.file);
    const texture = image ? new THREE.Texture(image) : new THREE.DataTexture(new Uint8Array([255, 255, 255, 0]), 1, 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    texture.anisotropy = 8;
    const [x, y, width, height] = sticker.box;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width * 4.205, height * 5.135), new THREE.MeshBasicMaterial({
      map: texture, transparent: true, alphaTest: .04, depthWrite: false, toneMapped: false,
    }));
    mesh.name = `honors-sticker-${sticker.id}`;
    mesh.userData.action = 'hover-honors-sticker';
    mesh.userData.label = sticker.label;
    mesh.position.set((x + width / 2 - .5) * 4.205, (.5 - y - height / 2) * 5.135, .085);
    group.add(mesh);
    return mesh;
  });
  return {
    group, meshes,
    update(target: THREE.Object3D | null, active: boolean, delta: number) {
      meshes.forEach((mesh, index) => {
        const amount = active && target === mesh ? 1 : 0;
        mesh.position.z = damp(mesh.position.z, .085 + amount * .11, 14, delta);
        mesh.scale.setScalar(damp(mesh.scale.x, 1 + amount * .022, 14, delta));
        mesh.rotation.z = damp(mesh.rotation.z, amount * (index % 2 ? -.012 : .012), 14, delta);
        mesh.rotation.x = damp(mesh.rotation.x, amount * -.025, 14, delta);
      });
    },
    reset() {
      meshes.forEach((mesh) => { mesh.position.z = .085; mesh.scale.setScalar(1); mesh.rotation.set(0, 0, 0); });
    },
  };
}

export function createHonorsArtworkElement(): HTMLElement {
  const paper = document.createElement('div');
  paper.className = 'education-artwork honors-artwork';
  const canvas = document.createElement('canvas');
  canvas.width = artworkSize.width; canvas.height = artworkSize.height;
  canvas.className = 'education-artwork__background';
  const context = canvas.getContext('2d');
  if (context) paintHonorsBackground(context);
  paper.append(canvas);
  for (const sticker of honorsStickers) {
    const image = document.createElement('img');
    image.className = 'education-artwork__sticker';
    image.src = `${directory}${sticker.file}`;
    image.alt = sticker.label;
    const [x, y, width, height] = sticker.box;
    Object.assign(image.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${width * 100}%`, height: `${height * 100}%` });
    paper.append(image);
  }
  return paper;
}
