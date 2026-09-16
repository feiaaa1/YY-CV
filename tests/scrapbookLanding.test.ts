import { expect, test } from 'vitest';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { createScrapbookModel } from '../src/models/scrapbook';
import { portfolioContent } from '../src/content/portfolio';

test.each([true, false])('turning print matches its source and landing surface (forward=%s)', async (forward) => {
  const model = createScrapbookModel(portfolioContent.categories[1]!, true);
  await model.actions.open();
  if (!forward) await model.actions.setProject(1);
  model.actions.setReducedMotion(false);
  model.actions.setHovered(true);
  model.root.userData.hoverPointer = { x: .7, y: .5 };
  for (let i = 0; i < 120; i++) model.update(1 / 60, 0);
  const rig = model.parts.get('book-hover-rig')!;
  const rigBefore = rig.quaternion.clone();
  const completion = model.actions.setProject(forward ? 1 : 0);
  const pivot = model.parts.get('turning-page-pivot')!;
  const timeline = gsap.getTweensOf(pivot.rotation).at(-1)!.parent as gsap.core.Timeline;
  timeline.pause().time(0);
  const corners = (name: string) => {
    model.root.updateMatrixWorld(true);
    const mesh = model.root.getObjectByName(name)!;
    return [[-2, -2.5], [2, -2.5], [-2, 2.5], [2, 2.5]].map(([x, y]) => mesh.localToWorld(new THREE.Vector3(x, y, 0)));
  };
  try {
    const source = corners(`active-${forward ? 'right' : 'left'}-page-print`);
    corners('turning-page-front').forEach((point, i) => expect(point.distanceTo(source[i]!)).toBeLessThan(.0001));
    for (let i = 0; i < 60; i++) model.update(1 / 60, 0);
    expect(rig.quaternion.angleTo(rigBefore)).toBeLessThan(.0001);
    timeline.time(.86 - .000001);
    const arriving = corners('turning-page-back');
    timeline.time(.88);
    const landed = corners(`active-${forward ? 'left' : 'right'}-page-print`);
    arriving.forEach((point, i) => expect(point.distanceTo(landed[i]!)).toBeLessThan(.0001));
    timeline.progress(1);
    await completion;
  } finally { model.dispose(); }
});
