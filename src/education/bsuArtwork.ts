import * as THREE from 'three';
import type { ScrapbookPage } from '../content/types';
import { damp } from '../three/runtime';

const directory = '/assets/education/bsu-left/';
const artworkSize = { width: 1200, height: 1420 };

type BsuSticker = {
  id: string;
  label: string;
  file: string;
  crop: [number, number, number, number];
  source: [number, number];
  box: [number, number, number, number];
};

export const bsuBackground = `${directory}background.png`;

export const bsuStickers: BsuSticker[] = [
  {
    id: 'title', label: '北京体育大学（211）', file: 'title.png',
    crop: [35, 65, 1990, 620], source: [2073, 759], box: [.055, .078, .84, .205],
  },
  {
    id: 'media-badge', label: 'Sports Media Better People', file: 'media-badge.png',
    crop: [220, 10, 1090, 995], source: [1536, 1024], box: [.77, .235, .20, .125],
  },
  {
    id: 'megaphone', label: '传播扩音器', file: 'megaphone.png',
    crop: [185, 45, 1190, 945], source: [1536, 1024], box: [.02, .405, .25, .15],
  },
  {
    id: 'stadium', label: '北京体育大学田径场', file: 'stadium.png',
    crop: [20, 8, 1325, 1130], source: [1379, 1141], box: [.56, .36, .42, .32],
  },
  {
    id: 'gpa', label: '绩点 3.84 / 4，专业排名 5 / 50', file: 'gpa.png',
    crop: [145, 90, 1810, 575], source: [2157, 729], box: [.04, .70, .94, .255],
  },
];

const images = new Map<string, HTMLImageElement>();
let loading: Promise<void> | undefined;

export function hasBsuArtwork(page: ScrapbookPage): boolean {
  return page.education?.experience.id === 'bsu' && page.education.continuation === 0;
}

export function loadBsuArtwork(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const files = ['background.png', ...bsuStickers.map((sticker) => sticker.file)];
  loading ??= Promise.all(files.map((file) => new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => { images.set(file, image); resolve(); };
    image.onerror = () => reject(new Error(`Unable to load BSU education artwork: ${file}`));
    image.src = `${directory}${file}`;
  }))).then(() => undefined).catch((error: unknown) => { loading = undefined; throw error; });
  return loading;
}

export function paintBsuArtwork(ctx: CanvasRenderingContext2D, flatten: boolean): boolean {
  const background = images.get('background.png');
  if (!background) return false;
  ctx.drawImage(background, 0, 0, artworkSize.width, artworkSize.height);
  if (flatten) for (const sticker of bsuStickers) {
    const image = images.get(sticker.file);
    if (!image) return false;
    const [sx, sy, sw, sh] = sticker.crop;
    const [x, y, width, height] = sticker.box;
    ctx.drawImage(
      image, sx, sy, sw, sh,
      x * artworkSize.width, y * artworkSize.height,
      width * artworkSize.width, height * artworkSize.height,
    );
  }
  return true;
}

export function createBsuStickerLayers() {
  const group = new THREE.Group();
  group.name = 'bsu-stickers';
  const meshes = bsuStickers.map((sticker) => {
    const image = images.get(sticker.file);
    const texture = image
      ? new THREE.Texture(image)
      : new THREE.DataTexture(new Uint8Array([255, 255, 255, 0]), 1, 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    texture.anisotropy = 8;
    const [sx, sy, sw, sh] = sticker.crop;
    const [sourceWidth, sourceHeight] = sticker.source;
    texture.repeat.set(sw / sourceWidth, sh / sourceHeight);
    texture.offset.set(sx / sourceWidth, 1 - (sy + sh) / sourceHeight);
    const [x, y, width, height] = sticker.box;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 4.205, height * 5.135),
      new THREE.MeshBasicMaterial({
        map: texture, transparent: true, alphaTest: .04, depthWrite: false, toneMapped: false,
      }),
    );
    mesh.name = `bsu-sticker-${sticker.id}`;
    mesh.userData.action = 'hover-education-sticker';
    mesh.userData.label = sticker.label;
    mesh.position.set((x + width / 2 - .5) * 4.205, (.5 - y - height / 2) * 5.135, .085);
    group.add(mesh);
    return mesh;
  });

  return {
    group,
    meshes,
    update(target: THREE.Object3D | null, active: boolean, delta: number) {
      meshes.forEach((mesh, index) => {
        const amount = active && target === mesh ? 1 : 0;
        mesh.position.z = damp(mesh.position.z, .085 + amount * .11, 14, delta);
        mesh.scale.setScalar(damp(mesh.scale.x, 1 + amount * .025, 14, delta));
        mesh.rotation.z = damp(mesh.rotation.z, amount * (index % 2 ? -.014 : .014), 14, delta);
        mesh.rotation.x = damp(mesh.rotation.x, amount * -.028, 14, delta);
      });
    },
    reset() {
      meshes.forEach((mesh) => {
        mesh.position.z = .085;
        mesh.scale.setScalar(1);
        mesh.rotation.set(0, 0, 0);
      });
    },
  };
}

export function createBsuArtworkElement(): HTMLElement {
  const paper = document.createElement('div');
  paper.className = 'education-artwork bsu-artwork';
  const background = document.createElement('img');
  background.src = bsuBackground;
  background.alt = '学习经历：北京体育大学（211），硕士，2025.9—2027.7，新闻与传播（体育传播）';
  background.className = 'education-artwork__background';
  paper.append(background);
  for (const sticker of bsuStickers) {
    const frame = document.createElement('span');
    frame.className = 'education-artwork__sticker';
    const [x, y, width, height] = sticker.box;
    Object.assign(frame.style, {
      left: `${x * 100}%`, top: `${y * 100}%`, width: `${width * 100}%`, height: `${height * 100}%`,
    });
    const image = document.createElement('img');
    image.src = `${directory}${sticker.file}`;
    image.alt = sticker.label;
    const [sx, sy, sw, sh] = sticker.crop;
    const [sourceWidth, sourceHeight] = sticker.source;
    Object.assign(image.style, {
      width: `${sourceWidth / sw * 100}%`, height: `${sourceHeight / sh * 100}%`,
      left: `${-sx / sw * 100}%`, top: `${-sy / sh * 100}%`,
    });
    frame.append(image);
    paper.append(frame);
  }
  return paper;
}
