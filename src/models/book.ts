import * as THREE from 'three';
import type { Category } from '../content/types';
import { makeTag, makeTextPanel, roundedRectShape, makeExtrudedMesh, updateTextPanel } from '../three/geometry';
import { createHandle, damp, type SculptModelHandle } from '../three/runtime';
import { createTimelineController } from '../animation/timelines';
import { createTextTexture, type TextTextureOptions } from '../three/textures';

type BookPageSide = 'left' | 'right';

function projectPageOptions(category: Category, index: number, side: BookPageSide): TextTextureOptions {
  const project = category.projects[index]!;
  return side === 'left'
    ? {
        title: project.title.zh,
        subtitle: project.summary.zh,
        kicker: `${category.title.en} · ${project.year}`,
        background: '#FFFDF7',
        foreground: '#20222A',
        accent: project.accent,
      }
    : {
        title: project.title.en,
        subtitle: `${project.tags.join('  /  ')}  ${project.summary.en}`,
        kicker: `PROJECT ${index + 1} / ${category.projects.length}`,
        background: '#FFFDF7',
        foreground: '#20222A',
        accent: project.accent,
      };
}

function createTurningLeaf(frontOptions: TextTextureOptions, backOptions: TextTextureOptions): THREE.Group {
  const leaf = new THREE.Group();
  leaf.name = 'turning-page';

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 4.08, 0.075),
    new THREE.MeshStandardMaterial({ color: '#EEE8DC', roughness: 0.94 }),
  );
  body.name = 'turning-page-body';
  body.castShadow = true;
  body.receiveShadow = true;
  leaf.add(body);

  const faceGeometry = new THREE.PlaneGeometry(3.47, 4.05);
  const front = new THREE.Mesh(
    faceGeometry,
    new THREE.MeshBasicMaterial({ map: createTextTexture(frontOptions), toneMapped: false }),
  );
  front.name = 'turning-page-front';
  front.position.z = 0.039;
  front.renderOrder = 4;
  leaf.add(front);

  const back = new THREE.Mesh(
    faceGeometry.clone(),
    new THREE.MeshBasicMaterial({ map: createTextTexture(backOptions), toneMapped: false }),
  );
  back.name = 'turning-page-back';
  back.position.z = -0.039;
  back.rotation.y = Math.PI;
  back.renderOrder = 4;
  leaf.add(back);

  leaf.userData.body = body;
  leaf.userData.frontPrint = front;
  leaf.userData.backPrint = back;
  return leaf;
}

function updateTurningLeaf(
  leaf: THREE.Group,
  frontOptions: TextTextureOptions,
  backOptions: TextTextureOptions,
): void {
  const front = leaf.userData.frontPrint as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  const back = leaf.userData.backPrint as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  front.material.map?.dispose();
  back.material.map?.dispose();
  front.material.map = createTextTexture(frontOptions);
  back.material.map = createTextTexture(backOptions);
  front.material.needsUpdate = true;
  back.material.needsUpdate = true;
  leaf.userData.frontContent = frontOptions;
  leaf.userData.backContent = backOptions;
}

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

  const leftPage = makeTextPanel(3.5, 4.08, 0.11, projectPageOptions(category, projectIndex, 'left'));
  leftPage.position.x = -1.78;
  leftPage.userData.action = 'previous-project';
  leftPivot.add(leftPage);
  targets.push(leftPage);

  const rightPage = makeTextPanel(3.5, 4.08, 0.11, projectPageOptions(category, projectIndex, 'right'));
  rightPage.position.x = 1.78;
  rightPage.userData.action = 'next-project';
  rightPivot.add(rightPage);
  targets.push(rightPage);

  const turningPivot = new THREE.Group();
  turningPivot.name = 'turning-page-pivot';
  // Keep the printed face 0.002 above the resting page face. A larger lift
  // creates a visible perspective jump when the temporary leaf is hidden.
  turningPivot.position.z = 0.018;
  const initialNextIndex = (projectIndex + 1) % category.projects.length;
  const turningPage = createTurningLeaf(
    projectPageOptions(category, projectIndex, 'right'),
    projectPageOptions(category, initialNextIndex, 'left'),
  );
  turningPage.visible = false;
  turningPivot.add(turningPage);
  root.add(turningPivot);
  parts.set(turningPivot.name, turningPivot);
  parts.set(turningPage.name, turningPage);
  parts.set('turning-page-body', turningPage.userData.body as THREE.Mesh);
  parts.set('turning-page-front', turningPage.userData.frontPrint as THREE.Mesh);
  parts.set('turning-page-back', turningPage.userData.backPrint as THREE.Mesh);

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
    updateTextPanel(leftPage, projectPageOptions(category, normalized, 'left'));
    updateTextPanel(rightPage, projectPageOptions(category, normalized, 'right'));
  };

  const leftPageCenterX = leftPivot.position.x + leftPage.position.x;
  const rightPageCenterX = rightPivot.position.x + rightPage.position.x;

  const setProject = (index: number) => {
    const normalized = (index + category.projects.length) % category.projects.length;
    const previous = root.userData.projectIndex as number;
    root.userData.projectIndex = normalized;
    if (normalized === previous || root.userData.open !== true) {
      updateProjectContent(normalized);
      return;
    }
    const forward = (normalized - previous + category.projects.length) % category.projects.length === 1;
    const frontSide: BookPageSide = forward ? 'right' : 'left';
    const backSide: BookPageSide = forward ? 'left' : 'right';
    updateTurningLeaf(
      turningPage,
      projectPageOptions(category, previous, frontSide),
      projectPageOptions(category, normalized, backSide),
    );
    turningPage.userData.frontProjectIndex = previous;
    turningPage.userData.backProjectIndex = normalized;
    turningPage.position.x = forward ? rightPageCenterX : leftPageCenterX;
    turningPage.visible = true;
    turningPivot.rotation.y = 0;

    // Prepare the page revealed as the leaf lifts. The destination page under
    // the back face is updated only after that face has completely covered it.
    if (forward) updateTextPanel(rightPage, projectPageOptions(category, normalized, 'right'));
    else updateTextPanel(leftPage, projectPageOptions(category, normalized, 'left'));

    const turnAngle = forward ? -Math.PI : Math.PI;
    return timelines.run((timeline) => {
      timeline
        .to(turningPivot.rotation, { y: turnAngle, duration: 0.64, ease: 'power2.inOut' }, 0)
        .call(() => {
          if (forward) updateTextPanel(leftPage, projectPageOptions(category, normalized, 'left'));
          else updateTextPanel(rightPage, projectPageOptions(category, normalized, 'right'));
        }, [], 0.64)
        .call(() => {
          turningPage.visible = false;
          turningPivot.rotation.y = 0;
        }, [], 0.67);
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
