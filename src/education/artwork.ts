import * as THREE from 'three';
import type { ScrapbookPage } from '../content/types';
import { damp } from '../three/runtime';

const directory = '/assets/education/page-1/';
export const educationBackground = `${directory}background.png`;
// Source rectangles exclude transparent padding; placement is relative to the supplied paper.
export const educationStickers = [
  { id: 'title', label: '天津仁爱学院', file: 'title.png', crop: [50, 145, 1880, 345], source: [1967, 639], box: [.058, .176, .755, .12] },
  { id: 'gpa', label: '绩点 3.94 / 4，专业排名 1 / 94', file: 'gpa.png', crop: [14, 14, 1917, 462], source: [1945, 486], box: [.063, .55, .874, .155] },
  { id: 'rank', label: '连续四年排名第一', file: 'rank.png', crop: [89, 160, 2000, 390], source: [2172, 724], box: [.065, .72, .48, .068] },
  { id: 'honors', label: '国家奖学金、天津市政府奖学金、天津市优秀学生、校长奖学金', file: 'honors.png', crop: [130, 195, 1910, 335], source: [2172, 724], box: [.062, .805, .875, .114] },
] as const;

const images = new Map<string, HTMLImageElement>();
let loading: Promise<void> | undefined;
export function loadEducationArtwork(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  loading ??= Promise.all(['background.png', ...educationStickers.map((item) => item.file)].map((file) => new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => { images.set(file, image); resolve(); };
    image.onerror = () => reject(new Error(`Unable to load education artwork: ${file}`));
    image.src = `${directory}${file}`;
  }))).then(() => undefined).catch((error: unknown) => { loading = undefined; throw error; });
  return loading;
}

export function hasEducationArtwork(page: ScrapbookPage): boolean {
  return page.education?.experience.id === 'renai' && page.education.continuation === 0;
}

export function paintEducationArtwork(ctx: CanvasRenderingContext2D, flatten: boolean): boolean {
  const background = images.get('background.png');
  if (!background) return false;
  ctx.drawImage(background, 0, 0, 1200, 1420);
  if (flatten) for (const sticker of educationStickers) {
    const image = images.get(sticker.file)!;
    const [x, y, width, height] = sticker.box;
    const [sx, sy, sw, sh] = sticker.crop;
    ctx.drawImage(image, sx, sy, sw, sh, x * 1200, y * 1420, width * 1200, height * 1420);
  }
  return true;
}

export function createEducationStickerLayers() {
  const group = new THREE.Group();
  group.name = 'education-stickers';
  const meshes = educationStickers.map((sticker) => {
    const image = images.get(sticker.file);
    const texture = image ? new THREE.Texture(image) : new THREE.DataTexture(new Uint8Array([255, 255, 255, 0]), 1, 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    texture.anisotropy = 8;
    const [sx, sy, sw, sh] = sticker.crop;
    const [iw, ih] = sticker.source;
    texture.repeat.set(sw / iw, sh / ih);
    texture.offset.set(sx / iw, 1 - (sy + sh) / ih);
    const [x, y, width, height] = sticker.box;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width * 4.205, height * 5.135), new THREE.MeshBasicMaterial({
      map: texture, transparent: true, alphaTest: 0.04, depthWrite: false, toneMapped: false,
    }));
    mesh.name = `education-sticker-${sticker.id}`;
    mesh.userData.action = 'hover-education-sticker';
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
        mesh.scale.setScalar(damp(mesh.scale.x, 1 + amount * .035, 14, delta));
        mesh.rotation.z = damp(mesh.rotation.z, amount * (index % 2 ? -.018 : .018), 14, delta);
        mesh.rotation.x = damp(mesh.rotation.x, amount * -.035, 14, delta);
      });
    },
    reset() {
      meshes.forEach((mesh) => { mesh.position.z = .085; mesh.scale.setScalar(1); mesh.rotation.set(0, 0, 0); });
    },
  };
}

export function createEducationArtworkElement(): HTMLElement {
  const paper = document.createElement('div');
  paper.className = 'education-artwork';
  const background = document.createElement('img');
  background.src = educationBackground;
  background.alt = '学习经历：本科，2021.9—2025.7，传媒与艺术学院，传播学（网络与新媒体）';
  background.className = 'education-artwork__background';
  paper.append(background);
  for (const sticker of educationStickers) {
    const frame = document.createElement('span');
    frame.className = 'education-artwork__sticker';
    const [x, y, w, h] = sticker.box;
    Object.assign(frame.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` });
    const image = document.createElement('img');
    image.src = `${directory}${sticker.file}`;
    image.alt = sticker.label;
    const [sx, sy, sw, sh] = sticker.crop;
    Object.assign(image.style, { width: `${sticker.source[0] / sw * 100}%`, height: `${sticker.source[1] / sh * 100}%`, left: `${-sx / sw * 100}%`, top: `${-sy / sh * 100}%` });
    frame.append(image);
    paper.append(frame);
  }
  return paper;
}
