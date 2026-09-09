import { gsap } from 'gsap';
import { describe, expect, test } from 'vitest';
import { portfolioContent } from '../src/content/portfolio';
import type { ExperienceScreen } from '../src/experience/stateMachine';
import { createDirectoryFolderModel } from '../src/models/directoryFolder';
import type { SculptModelHandle } from '../src/three/runtime';

type ModelRegistry = {
  cover: SculptModelHandle;
  directory: SculptModelHandle[];
  detail: SculptModelHandle | null;
  thanks: SculptModelHandle;
};

type PerformanceExports = {
  selectActiveModelHandles?: (screen: ExperienceScreen, registry: ModelRegistry) => SculptModelHandle[];
  addDirectoryEntranceAnimations?: (timeline: gsap.core.Timeline, folders: SculptModelHandle[]) => void;
};

describe('interactive rendering performance policy', () => {
  test('updates only model handles belonging to the visible screen', async () => {
    const module = await import('../src/experience/PortfolioExperience') as unknown as PerformanceExports;
    expect(module.selectActiveModelHandles).toBeTypeOf('function');
    if (!module.selectActiveModelHandles) return;

    const cover = {} as SculptModelHandle;
    const directory = [{}, {}] as SculptModelHandle[];
    const detail = {} as SculptModelHandle;
    const thanks = {} as SculptModelHandle;
    const registry = { cover, directory, detail, thanks };

    expect(module.selectActiveModelHandles('cover', registry)).toEqual([cover]);
    expect(module.selectActiveModelHandles('directory', registry)).toEqual(directory);
    expect(module.selectActiveModelHandles('detail', registry)).toEqual([detail]);
    expect(module.selectActiveModelHandles('thanks', registry)).toEqual([thanks]);
  });

  test('animates one collage group per entering folder instead of every sticker', async () => {
    const module = await import('../src/experience/PortfolioExperience') as unknown as PerformanceExports;
    expect(module.addDirectoryEntranceAnimations).toBeTypeOf('function');
    if (!module.addDirectoryEntranceAnimations) return;

    const variants = ['sport', 'business', 'technology', 'culture', 'cinema'] as const;
    const folders = variants.map((variant, index) => (
      createDirectoryFolderModel(portfolioContent.categories[index]!, variant, true)
    ));
    const stickerPieces = folders.flatMap((folder) => (
      folder.parts.get('collage-root')?.children ?? []
    ));
    const timeline = gsap.timeline({ paused: true });

    module.addDirectoryEntranceAnimations(timeline, folders);
    const tweens = timeline.getChildren(false, true, false) as gsap.core.Tween[];

    expect(tweens).toHaveLength(folders.length * 6);
    expect(tweens.every((tween) => !tween.targets().some((target) => (
      stickerPieces.includes(target as (typeof stickerPieces)[number])
    )))).toBe(true);
    timeline.kill();
    folders.forEach((folder) => folder.dispose());
  });
});
