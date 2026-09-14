import { expect, test } from 'vitest';
import { createScrapbookModel } from '../src/models/scrapbook';
import { portfolioContent } from '../src/content/portfolio';
import * as THREE from 'three';
import { PortfolioExperience } from '../src/experience/PortfolioExperience';

test('hidden first-page stickers do not intercept clicks on the next spread', async () => {
  const model = createScrapbookModel(portfolioContent.categories[1]!, true);
  await model.actions.setProject(1);
  model.root.updateMatrixWorld(true);
  const gpa = model.parts.get('education-sticker-gpa')!;
  const point = gpa.getWorldPosition(new THREE.Vector3());
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  camera.position.set(point.x, point.y, 20);
  camera.lookAt(point.x, point.y, 0);
  camera.updateMatrixWorld(true);
  const leftPage = model.parts.get('active-left-page')!;
  // Exercise the real picking method without constructing a WebGL renderer.
  const experience = Object.assign(Object.create(PortfolioExperience.prototype), {
    camera, raycaster: new THREE.Raycaster(), pointer: new THREE.Vector2(),
    targetOwners: new Map([[leftPage, model]]), finishTag: { visible: false },
    directoryGroup: { visible: false },
  }) as { pickTarget(): THREE.Object3D | null };
  expect(experience.pickTarget()).toBe(leftPage);
  expect(experience.pickTarget()?.userData.action).toBe('previous-project');
  model.dispose();
});

test('first learning page has four independent stickers that lift, restore, and disappear on the next spread', async () => {
  const model = createScrapbookModel(portfolioContent.categories[1]!, true);
  const stickers = ['title', 'gpa', 'rank', 'honors'].map((id) => model.parts.get(`education-sticker-${id}`)!);
  expect(stickers.every(Boolean)).toBe(true);
  expect(stickers.every((sticker) => model.interactiveTargets.includes(sticker))).toBe(true);
  const gpa = stickers[1]!;
  const restZ = gpa.position.z;
  model.actions.setReducedMotion(false);
  model.actions.setHovered(true);
  model.actions.setHoveredTarget(gpa);
  model.update(0.2, 0);
  expect(gpa.position.z).toBeGreaterThan(restZ);
  expect(gpa.scale.x).toBeGreaterThan(1);
  expect(stickers[0]!.scale.x).toBe(1);
  model.actions.setHoveredTarget(null);
  model.update(2, 2);
  expect(gpa.position.z).toBeCloseTo(restZ);
  model.actions.setReducedMotion(true);
  model.actions.setHoveredTarget(gpa);
  model.update(2, 4);
  expect(gpa.scale.x).toBeCloseTo(1);
  await model.actions.setProject(1);
  expect(model.parts.get('education-stickers')!.visible).toBe(false);
  await model.actions.setProject(0);
  expect(model.parts.get('education-stickers')!.visible).toBe(true);
  model.dispose();
});

test('first spread’s right page exposes the supplied title, note, and five award stickers', () => {
  const model = createScrapbookModel(portfolioContent.categories[1]!, true);
  const stickers = ['title', 'small-steps', 'award-01', 'award-02', 'award-03', 'award-04', 'award-05']
    .map((id) => model.parts.get(`honors-sticker-${id}`)!);
  expect(stickers.every(Boolean)).toBe(true);
  expect(stickers.every((sticker) => model.interactiveTargets.includes(sticker))).toBe(true);
  expect(model.parts.get('honors-stickers')!.visible).toBe(true);
  model.dispose();
});
