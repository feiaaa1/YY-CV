import { describe, expect, test } from 'vitest';
import { portfolioContent } from '../src/content/portfolio';
import { aboutProfile } from '../src/content/profile';

describe('portfolio content', () => {
  test('contains five bilingual categories and no legacy projects in the corkboard folder', () => {
    expect(portfolioContent.categories).toHaveLength(5);
    for (const category of portfolioContent.categories) {
      expect(category.title.zh.length).toBeGreaterThan(0);
      expect(category.title.en.length).toBeGreaterThan(0);
      expect(category.description.zh.length).toBeGreaterThan(0);
      expect(category.projects).toHaveLength(category.id === 'poster-editorial' ? 0 : 3);
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

  test('uses the supplied personal introduction content', () => {
    expect(portfolioContent.owner).toEqual({ zh: '韩婧仪', en: 'Ginny' });
    expect(portfolioContent.contact).toBe('17335581033');
    expect(aboutProfile.portraitSrc).toBe('/ginny-han-profile.jpeg');
    expect(aboutProfile.skills).toHaveLength(11);
    expect(aboutProfile.tags).toHaveLength(7);
    expect(aboutProfile.tags).toContain('王者最强王者20星');
  });

  test('provides the four real internship entries used by the corkboard', () => {
    const category = portfolioContent.categories.find(({ id }) => id === 'poster-editorial');
    expect(category?.journeyExperiences?.map(({ id }) => id)).toEqual(['migu', 'youdao', 'kuaishou', 'jd']);
    expect(category?.title.zh).toBe('实习经历');
  });

  test('provides learning experience spreads instead of sample design projects', () => {
    const pages = portfolioContent.categories[1]!.scrapbookPages!;
    expect(pages.length).toBeGreaterThanOrEqual(2);
    expect(new Set(pages.map(({ id }) => id)).size).toBe(pages.length);
    expect(new Set(pages.map((page) => page.title.zh))).toEqual(new Set(['天津仁爱学院', '北京体育大学（211）']));
    expect(pages.every((page) => page.education)).toBe(true);
  });
});
