import * as THREE from 'three';
import type { LocalizedText } from '../content/types';
import { createHandle, damp, type SculptModelHandle } from '../three/runtime';
import { folderBackShape, makeExtrudedMesh, makeTextPanel, roundedRectShape } from '../three/geometry';

export type FolderModelOptions = {
  id: string;
  color: string;
  title: LocalizedText;
  variant: 'cover' | 'directory';
  secondaryColor?: string;
};

export function createFolderModel(options: FolderModelOptions): SculptModelHandle {
  const root = new THREE.Group();
  root.name = options.id;
  const parts = new Map<string, THREE.Object3D>([['root', root]]);
  const interactiveTargets: THREE.Object3D[] = [];
  const width = options.variant === 'cover' ? 6.2 : 2.5;
  const height = options.variant === 'cover' ? 3.25 : 1.85;

  const back = makeExtrudedMesh(folderBackShape(width, height, width * 0.42), options.color, 0.16, 0.08);
  back.name = 'back-panel';
  back.position.z = -0.15;
  root.add(back);
  parts.set('back-panel', back);

  const insert = makeTextPanel(width * 0.84, height * 0.88, 0.06, {
    title: options.variant === 'cover' ? 'PORTFOLIO' : options.title.en.toUpperCase(),
    subtitle: options.variant === 'cover' ? '视觉与交互设计 · VISUAL & INTERACTION DESIGN' : options.title.zh,
    kicker: options.variant === 'cover' ? '2026 / DESIGN COLLECTION' : 'SELECTED WORK',
    background: '#FFF9EC',
    foreground: options.variant === 'cover' ? '#F0C64C' : '#19233B',
    accent: options.secondaryColor ?? '#F5D25A',
    align: 'center',
  });
  insert.name = 'inner-sheet';
  // Keep the sheet beyond the beveled front surface of the rear shell.  A
  // near-coplanar value makes the paper disappear behind the folder at the
  // straight-on camera angle used by the cover screen.
  insert.position.set(0, options.variant === 'cover' ? 0.25 : 0.46, 0.18);
  root.add(insert);
  parts.set('inner-sheet', insert);

  const flapPivot = new THREE.Group();
  flapPivot.name = 'front-flap';
  flapPivot.position.set(0, -height / 2, 0.15);
  const flap = makeExtrudedMesh(roundedRectShape(width, height * 0.72, 0.15), options.color, 0.18, 0.08);
  flap.position.y = height * 0.36;
  flap.name = 'front-flap-mesh';
  flap.userData.action = options.variant === 'cover' ? 'enter-directory' : 'open-category';
  flap.userData.categoryId = options.id;
  flapPivot.add(flap);
  root.add(flapPivot);
  parts.set('front-flap', flapPivot);
  interactiveTargets.push(flap);

  if (options.variant === 'cover') {
    const coverTitle = makeTextPanel(4.75, 1.45, 0.055, {
      title: 'OPEN THE FOLDER',
      subtitle: '点击开启 · INTERACTIVE PORTFOLIO',
      kicker: 'HELLO / 你好',
      background: options.color,
      foreground: '#FFF6C8',
      accent: options.secondaryColor ?? '#FFF4A6',
      align: 'center',
      width: 1200,
      height: 460,
    });
    coverTitle.name = 'cover-title';
    coverTitle.position.set(0, height * 0.36, 0.29);
    flapPivot.add(coverTitle);
    parts.set('cover-title', coverTitle);
  }

  if (options.variant === 'directory') {
    const iconColors = [options.secondaryColor ?? '#E9FF63', '#FFF9EC', '#1E2C50'];
    for (let index = 0; index < 3; index += 1) {
      const icon = makeExtrudedMesh(roundedRectShape(0.64, 0.72, 0.13), iconColors[index]!, 0.06, 0.025);
      icon.name = `icon-layer-${index}`;
      icon.position.set((index - 1) * 0.52, height * 0.52 + Math.abs(index - 1) * 0.06, 0.02 + index * 0.025);
      icon.rotation.z = (index - 1) * 0.18;
      root.add(icon);
      parts.set(icon.name, icon);
    }
    const label = makeTextPanel(2.25, 0.52, 0.04, {
      title: options.title.zh,
      subtitle: options.title.en.toUpperCase(),
      background: options.color,
      foreground: '#FFFFFF',
      align: 'center',
      width: 900,
      height: 300,
    });
    label.name = 'label-carrier';
    label.position.set(0, -height * 0.72, 0.08);
    root.add(label);
    parts.set('label-carrier', label);
  }

  root.userData.hovered = false;
  root.userData.open = false;
  return createHandle(
    root,
    parts,
    interactiveTargets,
    {
      setHovered: (hovered) => { root.userData.hovered = hovered; },
      open: () => { root.userData.open = true; },
      close: () => { root.userData.open = false; },
    },
    (delta, elapsed) => {
      const hover = root.userData.hovered ? 1 : 0;
      const open = root.userData.open ? 1 : 0;
      root.rotation.y = damp(root.rotation.y, hover * 0.08, 8, delta);
      root.rotation.x = damp(root.rotation.x, -hover * 0.045, 8, delta);
      root.position.y += Math.sin(elapsed * 1.4 + options.id.length) * 0.0008;
      insert.position.y = damp(insert.position.y, (options.variant === 'cover' ? 0.25 : 0.46) + hover * 0.14 + open * 0.45, 7, delta);
      flapPivot.rotation.x = damp(flapPivot.rotation.x, open ? -0.82 : hover * -0.08, 7, delta);
    },
  );
}
