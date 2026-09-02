import * as THREE from 'three';
import type { Category } from '../content/types';
import { makeTag, makeTextPanel, roundedRectShape, makeExtrudedMesh, updateTextPanel } from '../three/geometry';
import { createHandle, damp, type SculptModelHandle } from '../three/runtime';
import { createTimelineController } from '../animation/timelines';

export function createOpenBookModel(category: Category, projectIndex: number, reducedMotion = false): SculptModelHandle {
  const root = new THREE.Group();
  root.name = `book-${category.id}`;
  root.userData.projectIndex = projectIndex;
  root.userData.open = false;
  root.userData.reducedMotion = reducedMotion;
  const timelines = createTimelineController({ reducedMotion: () => root.userData.reducedMotion === true });
  const parts = new Map<string, THREE.Object3D>([['root', root]]);
  const targets: THREE.Object3D[] = [];

  const cover = makeExtrudedMesh(roundedRectShape(7.3, 4.4, 0.28), category.color, 0.18, 0.08);
  cover.name = 'rear-cover';
  cover.position.z = -0.25;
  root.add(cover);
  parts.set('rear-cover', cover);

  const leftPivot = new THREE.Group();
  leftPivot.name = 'left-page';
  leftPivot.position.x = -0.06;
  const rightPivot = new THREE.Group();
  rightPivot.name = 'right-page';
  rightPivot.position.x = 0.06;
  root.add(leftPivot, rightPivot);
  leftPivot.rotation.y = 1.18;
  rightPivot.rotation.y = -1.18;
  parts.set('left-page', leftPivot);
  parts.set('right-page', rightPivot);

  const current = category.projects[projectIndex]!;
  const leftPage = makeTextPanel(3.5, 4.08, 0.11, {
    title: current.title.zh,
    subtitle: current.summary.zh,
    kicker: `${category.title.en} · ${current.year}`,
    background: '#FFFDF7',
    foreground: '#20222A',
    accent: current.accent,
  });
  leftPage.position.x = -1.78;
  leftPage.userData.action = 'previous-project';
  leftPivot.add(leftPage);
  targets.push(leftPage);

  const rightPage = makeTextPanel(3.5, 4.08, 0.11, {
    title: current.title.en,
    subtitle: `${current.tags.join('  /  ')}\n${current.summary.en}`,
    kicker: 'SELECTED PROJECT',
    background: '#FFFDF7',
    foreground: '#20222A',
    accent: current.accent,
  });
  rightPage.position.x = 1.78;
  rightPage.userData.action = 'next-project';
  rightPivot.add(rightPage);
  targets.push(rightPage);

  const turningPivot = new THREE.Group();
  turningPivot.name = 'turning-page-pivot';
  turningPivot.position.z = 0.2;
  const turningPage = makeTextPanel(3.5, 4.08, 0.11, {
    title: current.title.en,
    subtitle: current.summary.en,
    kicker: 'SELECTED PROJECT',
    background: '#FFFDF7',
    foreground: '#20222A',
    accent: current.accent,
  });
  turningPage.name = 'turning-page';
  turningPage.visible = false;
  turningPivot.add(turningPage);
  root.add(turningPivot);
  parts.set(turningPivot.name, turningPivot);
  parts.set(turningPage.name, turningPage);

  const leftEdge = makeExtrudedMesh(roundedRectShape(3.38, 0.16, 0.04), '#E9E3D9', 0.12, 0.025);
  leftEdge.name = 'page-edge-left';
  leftEdge.position.set(-1.78, -2.04, 0.03);
  root.add(leftEdge);
  parts.set(leftEdge.name, leftEdge);

  const rightEdge = leftEdge.clone();
  rightEdge.name = 'page-edge-right';
  rightEdge.position.x = 1.78;
  root.add(rightEdge);
  parts.set(rightEdge.name, rightEdge);

  const indexTabs = new THREE.Group();
  indexTabs.name = 'index-tabs';
  root.add(indexTabs);
  parts.set(indexTabs.name, indexTabs);
  for (let index = 0; index < 5; index += 1) {
    const tab = makeExtrudedMesh(roundedRectShape(0.7, 0.45, 0.08), [category.secondaryColor, '#F6D95B', '#78E1EF'][index % 3]!, 0.06, 0.025);
    tab.name = `index-tab-${index}`;
    tab.position.set(index < 2 ? -3.78 : 3.78, 1.35 - (index % 3) * 0.72, -0.08 + index * 0.008);
    indexTabs.add(tab);
    parts.set(tab.name, tab);
  }

  const stickerField = new THREE.Group();
  stickerField.name = 'sticker-field';
  const stickerLabels = ['SKILLS', 'BRANDING', 'TEAMWORK', 'Ai', 'Ps'];
  stickerLabels.forEach((label, index) => {
    const sticker = makeTag(label, [category.secondaryColor, '#F6D95B', '#78E1EF', '#FF8A6E', '#D887EB'][index]!, 'next-project');
    sticker.scale.setScalar(index < 3 ? 0.5 : 0.42);
    sticker.position.set(1.25 + (index % 2) * 0.85, 0.8 - Math.floor(index / 2) * 0.7, 0.21 + index * 0.01);
    sticker.rotation.z = (index - 2) * 0.09;
    stickerField.add(sticker);
  });
  root.add(stickerField);
  parts.set(stickerField.name, stickerField);

  const spine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 3.9, 16),
    new THREE.MeshStandardMaterial({ color: '#E7E2D8', roughness: 0.9 }),
  );
  spine.name = 'spine';
  spine.position.z = 0.12;
  root.add(spine);
  parts.set('spine', spine);

  for (const side of [-1, 1]) {
    const clip = new THREE.Group();
    clip.name = side < 0 ? 'left-clip' : 'right-clip';
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.78, 0.18), new THREE.MeshStandardMaterial({ color: '#4B4C54', metalness: 0.9, roughness: 0.22 }));
    clip.add(bar);
    clip.position.set(side * 3.72, -0.45, 0.34);
    root.add(clip);
    parts.set(clip.name, clip);
  }

  const closeTag = makeTag('关闭', '#EFFF69', 'close-detail');
  closeTag.position.set(0, -2.65, 0.12);
  root.add(closeTag);
  parts.set('close-tag', closeTag);
  targets.push(closeTag);

  const updateProjectContent = (normalized: number): void => {
    const item = category.projects[normalized]!;
    updateTextPanel(leftPage, { title: item.title.zh, subtitle: item.summary.zh, kicker: `${category.title.en} · ${item.year}`, background: '#FFFDF7', foreground: '#20222A', accent: item.accent });
    updateTextPanel(rightPage, { title: item.title.en, subtitle: `${item.tags.join('  /  ')}  ${item.summary.en}`, kicker: `PROJECT ${normalized + 1} / ${category.projects.length}`, background: '#FFFDF7', foreground: '#20222A', accent: item.accent });
  };

  const setProject = (index: number) => {
    const normalized = (index + category.projects.length) % category.projects.length;
    const previous = root.userData.projectIndex as number;
    root.userData.projectIndex = normalized;
    if (normalized === previous || root.userData.open !== true) {
      updateProjectContent(normalized);
      return;
    }
    const forward = (normalized - previous + category.projects.length) % category.projects.length === 1;
    const previousItem = category.projects[previous]!;
    updateTextPanel(turningPage, {
      title: forward ? previousItem.title.en : previousItem.title.zh,
      subtitle: forward ? previousItem.summary.en : previousItem.summary.zh,
      kicker: `${category.title.en} · ${previousItem.year}`,
      background: '#FFFDF7', foreground: '#20222A', accent: previousItem.accent,
    });
    turningPage.position.x = forward ? 1.78 : -1.78;
    turningPage.visible = true;
    turningPivot.rotation.y = 0;
    const turnAngle = forward ? -Math.PI : Math.PI;
    return timelines.run((timeline) => {
      timeline
        .to(turningPivot.rotation, { y: turnAngle, duration: 0.72, ease: 'power2.inOut' }, 0)
        .call(() => {
          updateProjectContent(normalized);
          turningPage.visible = false;
          turningPivot.rotation.y = 0;
        }, [], 0.73);
    });
  };

  const handle = createHandle(root, parts, targets, {
    setProject,
    open: () => timelines.run((timeline) => {
      root.userData.open = true;
      timeline.to(leftPivot.rotation, { y: 0, duration: 0.72 }, 0).to(rightPivot.rotation, { y: 0, duration: 0.72 }, 0.06);
    }),
    close: () => timelines.run((timeline) => {
      root.userData.open = false;
      timeline
        .to(leftPivot.rotation, { y: 1.18, duration: 0.55 }, 0)
        .to(rightPivot.rotation, { y: -1.18, duration: 0.55 }, 0)
        .to(root.scale, { x: 0.02, y: 0.02, z: 0.02, duration: 0.5, ease: 'power2.in' }, 0.12);
    }),
  });
  const baseDispose = handle.dispose;
  handle.dispose = () => { timelines.killActiveTimeline(); baseDispose(); };
  return handle;
}
