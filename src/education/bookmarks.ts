import * as THREE from 'three';
import { damp } from '../three/runtime';
import { loadImageAsset } from '../performance/imageAssets';

const directory = '/assets/education/bookmarks/';

const bookmarkSpecs = [
  { id: 'master', label: '硕士', file: 'master.webp', projectIndex: 0, y: .72 },
  { id: 'bachelor', label: '本科', file: 'bachelor.webp', projectIndex: 1, y: -.14 },
] as const;

const images = new Map<string, HTMLImageElement>();
let loading: Promise<void> | undefined;

export const educationBookmarkAssetUrls = bookmarkSpecs.map((item) => `${directory}${item.file}`);

export function loadEducationBookmarks(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  loading ??= Promise.all(bookmarkSpecs.map(async (spec) => {
    images.set(spec.file, await loadImageAsset(`${directory}${spec.file}`, 'high'));
  })).then(() => undefined).catch((error: unknown) => { loading = undefined; throw error; });
  return loading;
}

export function createEducationBookmarkLayers(visible: boolean, initialIndex: number) {
  const group = new THREE.Group();
  group.name = 'education-bookmarks';
  group.visible = visible;
  const baseX = -4.48;
  const meshes = bookmarkSpecs.map((spec) => {
    const image = images.get(spec.file);
    const texture = image
      ? new THREE.Texture(image)
      : new THREE.DataTexture(new Uint8Array([255, 255, 255, 0]), 1, 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    texture.anisotropy = 8;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.64, .775),
      new THREE.MeshBasicMaterial({
        map: texture, transparent: true, alphaTest: .04, depthWrite: true, toneMapped: false,
      }),
    );
    mesh.name = `education-bookmark-${spec.id}`;
    mesh.userData.action = 'select-project-index';
    mesh.userData.projectIndex = spec.projectIndex;
    mesh.userData.label = `${spec.label}学历`;
    mesh.userData.baseY = spec.y;
    mesh.position.set(baseX, spec.y, -.08);
    mesh.renderOrder = 4;
    group.add(mesh);
    return mesh;
  });

  let activeIndex = initialIndex;
  return {
    group,
    meshes,
    setActive(index: number) { activeIndex = index; },
    update(target: THREE.Object3D | null, enabled: boolean, delta: number) {
      meshes.forEach((mesh) => {
        const projectIndex = mesh.userData.projectIndex as number;
        const active = projectIndex === activeIndex;
        const hovered = enabled && target === mesh;
        mesh.position.x = damp(mesh.position.x, baseX - (active ? .16 : hovered ? .09 : 0), 14, delta);
        mesh.position.z = damp(mesh.position.z, -.08 + (active ? .012 : hovered ? .008 : 0), 14, delta);
        const scale = active ? 1.045 : hovered ? 1.025 : 1;
        mesh.scale.setScalar(damp(mesh.scale.x, scale, 14, delta));
      });
    },
    reset() {
      meshes.forEach((mesh) => {
        mesh.position.set(baseX, mesh.userData.baseY as number, -.08);
        mesh.scale.setScalar(1);
      });
    },
  };
}
