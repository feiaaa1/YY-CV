import { describe, expect, test } from 'vitest';
import { portfolioContent } from '../src/content/portfolio';

describe('portfolio content', () => {
  test('contains five bilingual categories with three projects each', () => {
    expect(portfolioContent.categories).toHaveLength(5);
    for (const category of portfolioContent.categories) {
      expect(category.title.zh.length).toBeGreaterThan(0);
      expect(category.title.en.length).toBeGreaterThan(0);
      expect(category.description.zh.length).toBeGreaterThan(0);
      expect(category.projects).toHaveLength(3);
    }
  });

  test('uses the requested descriptions in directory order', () => {
    expect(portfolioContent.categories.map(({ description }) => description.zh)).toEqual([
      '个人介绍', '校园经历', '实习经历', '专业技能', '项目作品',
    ]);
  });

  test('maps the agreed categories to the correct detail presentation', () => {
    expect(portfolioContent.categories.map(({ id, presentation }) => [id, presentation])).toEqual([
      ['brand', 'about'],
      ['ui-web', 'scrapbook'],
      ['poster-editorial', 'journey'],
      ['illustration', 'book'],
      ['motion-3d', 'ticket'],
    ]);
  });

  test('provides four placeholder internship stops for the journey folder', () => {
    const category = portfolioContent.categories.find(({ id }) => id === 'poster-editorial');
    const experiences = category?.journeyExperiences;
    expect(experiences).toHaveLength(4);
    expect(new Set(experiences?.map(({ id }) => id) ?? []).size).toBe(4);
  });

  test('provides five distinct scrapbook pages for the UI and web folder', () => {
    const category = portfolioContent.categories.find(({ id }) => id === 'ui-web');
    expect(category?.scrapbookPages).toHaveLength(5);
    expect(new Set(category?.scrapbookPages?.map(({ id }) => id)).size).toBe(5);
    expect(category?.scrapbookPages?.map(({ title }) => title.en)).toEqual([
      'Hello, Portfolio', 'Mobile Product', 'Editorial Website', 'Design Process', 'Thank You',
    ]);
  });
});
