import { expect, test } from 'vitest';
import { createScrapbookModel } from '../src/models/scrapbook';
import { portfolioContent } from '../src/content/portfolio';
import * as THREE from 'three';
import { PortfolioExperience } from '../src/experience/PortfolioExperience';
import { honorsAssetUrls, honorsStickers } from '../src/education/honorsArtwork';

test('Renai honors page keeps the current heading artwork and uses the incoming awards image below it', () => {
  expect(honorsStickers.map(({ id, file, box }) => ({ id, file, box }))).toEqual([
    { id: 'title', file: 'title.webp', box: [.06, .098, .46, .096] },
    { id: 'small-steps', file: 'small-steps.webp', box: [.67, .055, .285, .14] },
    { id: 'awards', file: 'awards-transparent.png', box: [.06, .35, .88, .44] },
  ]);
  expect(honorsAssetUrls).toContain('/assets/education/page-2/awards-transparent.png');
});

test('hidden BSU stickers do not intercept clicks on the bachelor spread', async () => {
  const model = createScrapbookModel(portfolioContent.categories[1]!, true);
  await model.actions.setProject(1);
  model.root.updateMatrixWorld(true);
  const gpa = model.parts.get('bsu-sticker-gpa')!;
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
  const target = experience.pickTarget();
  expect(target?.name.startsWith('bsu-sticker-')).toBe(false);
  expect(target?.userData.action).toBe('previous-project');
  model.dispose();
});

test('bachelor page has four independent stickers that lift, restore, and disappear on the master spread', async () => {
  const model = createScrapbookModel(portfolioContent.categories[1]!, true);
  await model.actions.setProject(1);
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
  await model.actions.setProject(0);
  expect(model.parts.get('education-stickers')!.visible).toBe(false);
  await model.actions.setProject(1);
  expect(model.parts.get('education-stickers')!.visible).toBe(true);
  model.dispose();
});

test('bachelor spread’s right page exposes the supplied title, note, and combined awards artwork', async () => {
  const model = createScrapbookModel(portfolioContent.categories[1]!, true);
  await model.actions.setProject(1);
  const stickers = ['title', 'small-steps', 'awards']
    .map((id) => model.parts.get(`honors-sticker-${id}`)!);
  expect(stickers.every(Boolean)).toBe(true);
  expect(stickers.every((sticker) => model.interactiveTargets.includes(sticker))).toBe(true);
  expect(stickers.every((sticker) => sticker.userData.action === 'hover-honors-sticker')).toBe(true);
  expect(['award-01', 'award-02', 'award-03', 'award-04', 'award-05']
    .every((id) => !model.parts.has(`honors-sticker-${id}`))).toBe(true);
  expect([...model.parts.keys()].some((key) => key.startsWith('honors-sticker-award-'))).toBe(false);
  expect(model.parts.get('honors-stickers')!.visible).toBe(true);
  model.dispose();
});

test('first learning spread exposes both supplied BSU backgrounds and all independent stickers', () => {
  const model = createScrapbookModel(portfolioContent.categories[1]!, true);
  const stickerIds = ['title', 'media-badge', 'megaphone', 'stadium', 'gpa'];
  const stickers = stickerIds.map((id) => model.parts.get(`bsu-sticker-${id}`)!);

  expect(stickers.every(Boolean)).toBe(true);
  expect(stickers.every((sticker) => model.interactiveTargets.includes(sticker))).toBe(true);
  expect(model.parts.get('bsu-stickers')!.visible).toBe(true);
  expect(stickers.every((sticker) => sticker.userData.action === 'hover-education-sticker')).toBe(true);
  expect(model.parts.get('education-stickers')!.visible).toBe(false);
  expect(model.parts.get('honors-stickers')!.visible).toBe(false);
  const rightStickerIds = ['title', 'knowledge', 'academic', 'practice'];
  const rightStickers = rightStickerIds.map((id) => model.parts.get(`bsu-right-sticker-${id}`)!);
  expect(rightStickers.every(Boolean)).toBe(true);
  expect(rightStickers.every((sticker) => model.interactiveTargets.includes(sticker))).toBe(true);
  expect(rightStickers.every((sticker) => sticker.userData.action === 'next-project')).toBe(true);
  expect(model.parts.get('bsu-right-stickers')!.visible).toBe(true);

  model.dispose();
});
