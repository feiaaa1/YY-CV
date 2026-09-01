import * as THREE from 'three';
import type { Category } from '../content/types';
import { createHandle, damp, type SculptModelHandle } from '../three/runtime';
import { makeExtrudedMesh, makeTag, makeTextPanel, roundedRectShape, ticketShape, updateTextPanel } from '../three/geometry';
import { createTimelineController } from '../animation/timelines';

export function createTicketStackModel(category: Category, projectIndex: number, reducedMotion = false): SculptModelHandle {
  const root = new THREE.Group();
  root.name = `ticket-${category.id}`;
  root.userData.projectIndex = projectIndex;
  root.userData.open = false;
  root.userData.reducedMotion = reducedMotion;
  const timelines = createTimelineController({ reducedMotion: () => root.userData.reducedMotion === true });
  const parts = new Map<string, THREE.Object3D>([['root', root]]);
  const targets: THREE.Object3D[] = [];

  const backNotes = [
    { x: -1.7, y: 1.15, r: -0.08, c: '#EDFF69', label: 'IDEAS / 灵感' },
    { x: 1.45, y: 1.25, r: 0.06, c: '#FFFDF7', label: '067–5309' },
    { x: -0.2, y: -1.62, r: 0.02, c: '#FFFDF7', label: '··· — ···' },
  ];
  backNotes.forEach((note, index) => {
    const card = makeTextPanel(index === 2 ? 2.8 : 2.5, index === 2 ? 0.62 : 1.1, 0.08, { title: note.label, background: note.c, foreground: '#1C202A', align: 'center', mono: true, width: 700, height: 300 });
    card.name = `rear-card-${index}`;
    card.position.set(note.x, note.y, -0.16 - index * 0.02);
    card.rotation.z = note.r;
    root.add(card);
    parts.set(card.name, card);
  });
  parts.set('rear-note', parts.get('rear-card-0')!);
  parts.set('serial-tab', parts.get('rear-card-1')!);
  parts.set('lower-strip', parts.get('rear-card-2')!);

  const main = makeExtrudedMesh(ticketShape(6.8, 3.55, 20), '#FFFDF7', 0.12, 0.025);
  main.name = 'main-ticket';
  main.position.z = 0.08;
  root.add(main);
  parts.set('main-ticket', main);

  const current = category.projects[projectIndex]!;
  const content = makeTextPanel(5.8, 2.65, 0.045, {
    title: current.title.en,
    subtitle: `${current.title.zh}  ·  ${current.summary.en}`,
    kicker: `${current.year}  /  ${current.tags.join(' + ')}`,
    background: '#FFFDF7',
    foreground: '#171923',
    accent: current.accent,
    mono: true,
  });
  content.name = 'text-carrier';
  content.position.z = 0.23;
  content.userData.action = 'next-project';
  root.add(content);
  parts.set('text-carrier', content);
  targets.push(content);

  const fold = makeExtrudedMesh(new THREE.Shape().moveTo(0, 0).lineTo(0.52, 0).lineTo(0, 0.52).closePath(), '#ECE8DD', 0.04, 0);
  fold.name = 'fold-corner';
  fold.position.set(2.88, 1.28, 0.24);
  root.add(fold);
  parts.set('fold-corner', fold);

  const serrated = new THREE.Group();
  serrated.name = 'serrated-edge';
  for (let index = 0; index < 18; index += 1) {
    const toothShape = new THREE.Shape().moveTo(-0.12, 0).lineTo(0.12, 0).lineTo(0, -0.18).closePath();
    const tooth = makeExtrudedMesh(toothShape, '#FFFDF7', 0.07, 0);
    tooth.position.set(-3.05 + index * 0.36, -1.74, 0.08);
    serrated.add(tooth);
  }
  root.add(serrated);
  parts.set('serrated-edge', serrated);

  const iconTag = makeTag('●  ◆  ☠', '#EDFF69', 'previous-project');
  iconTag.position.set(2.35, -1.88, 0.18);
  root.add(iconTag);
  parts.set('icon-tag', iconTag);
  targets.push(iconTag);

  const closeTag = makeTag('CLOSE / 关闭', category.secondaryColor, 'close-detail');
  closeTag.position.set(-2.4, -2.36, 0.12);
  root.add(closeTag);
  parts.set('close-tag', closeTag);
  targets.push(closeTag);

  const setProject = (index: number) => {
    const normalized = (index + category.projects.length) % category.projects.length;
    root.userData.projectIndex = normalized;
    const item = category.projects[normalized]!;
    updateTextPanel(content, { title: item.title.en, subtitle: `${item.title.zh}  ·  ${item.summary.en}`, kicker: `${item.year} / ${item.tags.join(' + ')}`, background: '#FFFDF7', foreground: '#171923', accent: item.accent, mono: true });
  };

  const handle = createHandle(root, parts, targets, {
    setProject,
    open: () => timelines.run((timeline) => {
      root.userData.open = true;
      backNotes.forEach((_note, index) => {
        const card = parts.get(`rear-card-${index}`);
        if (card) timeline.fromTo(card.position, { y: 0 }, { y: [1.15, 1.25, -1.62][index]!, duration: 0.52 }, index * 0.07);
      });
      timeline.fromTo(content.position, { x: 5 }, { x: 0, duration: 0.58 }, 0.08);
    }),
    close: () => timelines.run((timeline) => {
      root.userData.open = false;
      timeline.to(content.position, { x: -5, duration: 0.42 }, 0);
      backNotes.forEach((_note, index) => {
        const card = parts.get(`rear-card-${index}`);
        if (card) timeline.to(card.position, { y: 0, duration: 0.36 }, 0.04 + index * 0.04);
      });
    }),
  });
  const baseDispose = handle.dispose;
  handle.dispose = () => { timelines.killActiveTimeline(); baseDispose(); };
  return handle;
}
