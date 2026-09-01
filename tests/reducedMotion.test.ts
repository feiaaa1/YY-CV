import { describe, expect, test } from 'vitest';
import { portfolioContent } from '../src/content/portfolio';
import { createCoverModel } from '../src/models/cover';
import { createDirectoryFolderModel } from '../src/models/directoryFolder';
import { createAboutCvModel } from '../src/models/aboutCv';
import { createScrapbookModel } from '../src/models/scrapbook';
import { createJourneyModel } from '../src/models/journey';
import experienceSource from '../src/experience/PortfolioExperience.ts?raw';

function getMethodBody(source: string, signature: string): string {
  const start = source.indexOf(signature);
  if (start < 0) throw new Error(`Could not find ${signature}`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;

  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(bodyStart + 1, index);
  }

  throw new Error(`Could not find the end of ${signature}`);
}

function settle(update: (delta: number, elapsed: number) => void, elapsed = 3.2, ticks = 150): void {
  for (let index = 0; index < ticks; index += 1) update(1 / 60, elapsed);
}

describe('live reduced motion', () => {
  test('model factories seed live state from their reduced-motion argument', () => {
    const cover = createCoverModel(true);
    const folder = createDirectoryFolderModel(portfolioContent.categories[0]!, 'sport', true);
    const journey = createJourneyModel(portfolioContent.categories[2]!, true);

    expect(cover.root.userData.reducedMotion).toBe(true);
    expect(folder.root.userData.reducedMotion).toBe(true);
    expect(journey.root.userData.reducedMotion).toBe(true);

    cover.dispose();
    folder.dispose();
    journey.dispose();
  });

  test('cover parallax settles to rest when the preference turns on mid-session', () => {
    const cover = createCoverModel(false);
    const assembly = cover.parts.get('folder-assembly')!;

    cover.root.userData.hoverPointer = { x: 0.9, y: 0.6 };
    cover.actions.setHovered(true);
    settle(cover.update, 0, 40);
    expect(assembly.rotation.y).toBeGreaterThan(0.3);

    cover.actions.setReducedMotion(true);
    settle(cover.update, 0);
    expect(assembly.rotation.y).toBeCloseTo(0.18, 3);
    cover.dispose();
  });

  test('directory folder stops opening its pocket on hover under reduced motion', () => {
    const folder = createDirectoryFolderModel(portfolioContent.categories[0]!, 'business', false);
    const hinge = folder.parts.get('front-pocket-hinge')!;

    folder.root.userData.hoverPointer = { x: 0.8, y: 0.6 };
    folder.actions.setHovered(true);
    settle(folder.update, 0, 40);
    expect(hinge.rotation.x).toBeGreaterThan(0.1);

    folder.actions.setReducedMotion(true);
    settle(folder.update, 0);
    expect(Math.abs(hinge.rotation.x)).toBeLessThan(1e-4);
    folder.dispose();
  });

  test('about CV stops idle paperclip drift under reduced motion', () => {
    const about = createAboutCvModel(portfolioContent.categories[0]!, false);
    const clip = about.parts.get('brown-paperclip')!;

    settle(about.update, 3.2, 60);
    expect(Math.abs(clip.rotation.y)).toBeGreaterThan(0.005);

    about.actions.setReducedMotion(true);
    settle(about.update);
    expect(Math.abs(clip.rotation.y)).toBeLessThan(5e-4);
    about.dispose();
  });

  test('scrapbook stops hover tilt under reduced motion', () => {
    const scrapbook = createScrapbookModel(portfolioContent.categories[1]!, false);
    const hoverRig = scrapbook.parts.get('book-hover-rig')!;

    scrapbook.root.userData.hoverPointer = { x: 0.9, y: 0.7 };
    scrapbook.actions.setHovered(true);
    settle(scrapbook.update, 0, 40);
    expect(hoverRig.rotation.y).toBeGreaterThan(0.045);

    scrapbook.actions.setReducedMotion(true);
    settle(scrapbook.update, 0);
    expect(Math.abs(hoverRig.rotation.y)).toBeLessThan(1e-4);
    scrapbook.dispose();
  });

  test('journey stops hover tilt and station pulsing under reduced motion', () => {
    const journey = createJourneyModel(portfolioContent.categories[2]!, false);
    const rig = journey.parts.get('journey-hover-rig')!;
    const station = journey.parts.get('station-1')!;

    journey.root.userData.hoverPointer = { x: 0.9, y: 0.7 };
    journey.actions.setHovered(true);
    settle(journey.update, 0, 40);
    expect(Math.abs(rig.rotation.y)).toBeGreaterThan(0.02);

    journey.actions.setReducedMotion(true);
    settle(journey.update, 0);
    expect(Math.abs(rig.rotation.y)).toBeLessThan(1e-4);
    expect(station.scale.x).toBeCloseTo(1, 3);
    journey.dispose();
  });
});

describe('experience lifecycle', () => {
  test('keeps the reduced-motion media query as a field with a paired listener', () => {
    expect(experienceSource).toMatch(/private readonly reducedMotionQuery = window\.matchMedia\(/);
    expect(experienceSource).toContain("addEventListener('change', this.onReducedMotionChange)");
    expect(experienceSource).toContain("removeEventListener('change', this.onReducedMotionChange)");
  });

  test('propagates preference changes to every handle and resets interaction state', () => {
    const body = getMethodBody(experienceSource, 'private readonly onReducedMotionChange');

    expect(body).toMatch(/for \(const handle of this\.modelHandles\) handle\.actions\.setReducedMotion\(reduced\);/);
    expect(body).toMatch(/this\.resetGestureState\(\);/);
    expect(body).toMatch(/this\.hoveredHandle = null;/);
    expect(body).toMatch(/this\.camera\.position/);
  });

  test('pauses rendering while the document is hidden and resumes one loop', () => {
    const body = getMethodBody(experienceSource, 'private readonly onVisibilityChange');

    expect(experienceSource).toContain("addEventListener('visibilitychange', this.onVisibilityChange)");
    expect(experienceSource).toContain("removeEventListener('visibilitychange', this.onVisibilityChange)");
    expect(body).toMatch(/document\.hidden/);
    expect(body).toMatch(/this\.stopAnimation\(\);/);
    expect(body).toMatch(/this\.clock\.getDelta\(\);/);
    expect(body).toMatch(/this\.scheduleFrame\(\);/);
  });

  test('schedules at most one animation frame and stops after destruction', () => {
    const scheduleFrame = getMethodBody(experienceSource, 'private scheduleFrame');
    const animate = getMethodBody(experienceSource, 'private readonly animate');

    expect(scheduleFrame).toMatch(/if \(this\.destroyed \|\| this\.frameId !== 0\) return;/);
    expect(animate).toMatch(/this\.frameId = 0;/);
    expect(animate).toMatch(/if \(this\.destroyed\) return;/);
    expect(animate).toMatch(/this\.scheduleFrame\(\);/);
    expect(experienceSource).not.toContain('this.animate();');
  });

  test('destroy runs exactly once', () => {
    const body = getMethodBody(experienceSource, 'destroy(): void');

    expect(body).toMatch(/if \(this\.destroyed\) return;\s*this\.destroyed = true;/);
    expect(body).toMatch(/this\.stopAnimation\(\);/);
  });

  test('holds the camera still instead of tracking the pointer under reduced motion', () => {
    const body = getMethodBody(experienceSource, 'private readonly animate');
    const parallax = body.slice(body.indexOf('const tracksPointer'));

    expect(parallax).toMatch(/this\.state\.reducedMotion/);
    expect(parallax).toMatch(/const cameraX = tracksPointer \? this\.pointer\.x \* 0\.12 : 0;/);
    expect(parallax).toMatch(/const cameraY = 0\.25 \+ \(tracksPointer \? this\.pointer\.y \* 0\.08 : 0\);/);
  });
});
