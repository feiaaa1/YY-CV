import * as THREE from 'three';
import type { ScrapbookPage } from '../content/types';
import { damp } from '../three/runtime';

const directory = '/assets/education/bsu-right/';
const artworkSize = { width: 1200, height: 1420 };

type BsuRightSticker = {
  id: string;
  label: string;
  file: string;
  crop: [number, number, number, number];
  source: [number, number];
  box: [number, number, number, number];
};

export const bsuRightBackground = `${directory}background.png`;

export const bsuRightStickers: BsuRightSticker[] = [
  {
    id: 'title', label: '学术与实践', file: 'title.png',
    crop: [35, 35, 1940, 680], source: [2025, 776], box: [.067, .10, .565, .127],
  },
  {
    id: 'knowledge', label: 'Knowledge Moves Further', file: 'knowledge.png',
    crop: [165, 15, 1460, 840], source: [1774, 887], box: [.663, .073, .276, .167],
  },
  {
    id: 'academic', label: '学术成果', file: 'academic.png',
    crop: [55, 38, 1840, 705], source: [1954, 805], box: [.031, .259, .945, .344],
  },
  {
    id: 'practice', label: '实践经历', file: 'practice.png',
    crop: [105, 50, 1940, 590], source: [2172, 724], box: [.041, .615, .923, .305],
  },
];

const images = new Map<string, HTMLImageElement>();
let loading: Promise<void> | undefined;

export function hasBsuRightArtwork(page: ScrapbookPage): boolean {
  return page.education?.experience.id === 'bsu' && page.education.continuation === 0;
}

export function loadBsuRightArtwork(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const files = ['background.png', ...bsuRightStickers.map((sticker) => sticker.file)];
  loading ??= Promise.all(files.map((file) => new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => { images.set(file, image); resolve(); };
    image.onerror = () => reject(new Error(`Unable to load BSU right-page artwork: ${file}`));
    image.src = `${directory}${file}`;
  }))).then(() => undefined).catch((error: unknown) => { loading = undefined; throw error; });
  return loading;
}

export function paintBsuRightArtwork(ctx: CanvasRenderingContext2D, flatten: boolean): boolean {
  const background = images.get('background.png');
  if (!background) return false;
  ctx.drawImage(background, 0, 0, artworkSize.width, artworkSize.height);
  if (flatten) for (const sticker of bsuRightStickers) {
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

export function createBsuRightStickerLayers() {
  const group = new THREE.Group();
  group.name = 'bsu-right-stickers';
  const meshes = bsuRightStickers.map((sticker) => {
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
    mesh.name = `bsu-right-sticker-${sticker.id}`;
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
        mesh.scale.setScalar(damp(mesh.scale.x, 1 + amount * .022, 14, delta));
        mesh.rotation.z = damp(mesh.rotation.z, amount * (index % 2 ? -.012 : .012), 14, delta);
        mesh.rotation.x = damp(mesh.rotation.x, amount * -.025, 14, delta);
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

export function createBsuRightArtworkElement(): HTMLElement {
  const paper = document.createElement('div');
  paper.className = 'education-artwork bsu-right-artwork';
  const background = document.createElement('img');
  background.src = bsuRightBackground;
  background.alt = '学术与实践：三项学术成果与两项赛事实践经历';
  background.className = 'education-artwork__background';
  paper.append(background);
  for (const sticker of bsuRightStickers) {
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
