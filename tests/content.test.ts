import { describe, expect, test } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { portfolioContent } from '../src/content/portfolio';
import { projectShowcaseAssetUrls } from '../src/content/projectExperience';
import { aboutProfile } from '../src/content/profile';

describe('portfolio content', () => {
  test('contains five bilingual categories and no legacy projects in the corkboard folder', () => {
    expect(portfolioContent.categories).toHaveLength(5);
    for (const category of portfolioContent.categories) {
      expect(category.title.zh.length).toBeGreaterThan(0);
      expect(category.title.en.length).toBeGreaterThan(0);
      expect(category.description.zh.length).toBeGreaterThan(0);
      // The internship corkboard, the skills accordion and the project deck
      // carry their own copy structures instead of the three sample projects.
      const legacyProjects = !['poster-editorial', 'illustration', 'motion-3d'].includes(category.id);
      expect(category.projects).toHaveLength(legacyProjects ? 3 : 0);
    }
  });

  test('uses the requested descriptions in directory order', () => {
    expect(portfolioContent.categories.map(({ description }) => description.zh)).toEqual([
      '个人介绍', '校园经历', '实习经历', 'AI作品集', '项目经历',
    ]);
  });

  test('maps the agreed categories to the correct detail presentation', () => {
    expect(portfolioContent.categories.map(({ id, presentation }) => [id, presentation])).toEqual([
      ['brand', 'about'],
      ['ui-web', 'scrapbook'],
      ['poster-editorial', 'journey'],
      ['illustration', 'accordion'],
      ['motion-3d', 'projects'],
    ]);
  });

  test('carries the seven cards of the fifth folder', () => {
    const category = portfolioContent.categories.find(({ id }) => id === 'motion-3d')!;
    const showcases = category.projectShowcases ?? [];

    expect(category.title.zh).toBe('项目经历');
    expect(showcases.map(({ code }) => code)).toEqual(['01', '02', '03', '04', '05', '06', '07']);
    expect(new Set(showcases.map(({ id }) => id)).size).toBe(showcases.length);

    for (const item of showcases) {
      expect(item.title.zh.length).toBeGreaterThan(0);
      expect(item.title.en.length).toBeGreaterThan(0);
      expect(item.summary.zh.length).toBeGreaterThan(20);
      expect(item.aside.zh.length).toBeGreaterThan(0);
      expect(item.tags.length).toBeGreaterThanOrEqual(2);
      expect(item.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(item.media.startsWith('/assets/')).toBe(true);
      expect(existsSync(join(process.cwd(), 'public', item.media))).toBe(true);
      if (item.video) expect(existsSync(join(process.cwd(), 'public', item.video))).toBe(true);
      if (item.detailPdf) expect(existsSync(join(process.cwd(), 'public', item.detailPdf))).toBe(true);
      for (const media of item.mediaItems ?? []) {
        expect(media.src.startsWith('/assets/')).toBe(true);
        expect(existsSync(join(process.cwd(), 'public', media.src))).toBe(true);
      }
    }

    // The cards this suite owns stay galleries; other cards may grow their own.
    expect(['01', '04', '05', '07'].map((code) => (
      showcases.find((item) => item.code === code)?.mediaKind
    ))).toEqual(['gallery', 'gallery', 'gallery', 'gallery']);
    expect(showcases[0]?.mediaItems?.map(({ kind }) => kind)).toEqual(['image', 'image', 'video']);
    expect(showcases[1]?.title.zh).toContain('转转');
    expect(showcases[1]?.detailPdf).toContain('.pdf');
  });

  test('fills the fifth card with the supplied Kuaishou AI visuals', () => {
    const category = portfolioContent.categories.find(({ id }) => id === 'motion-3d')!;
    const card = category.projectShowcases?.find(({ code }) => code === '05')!;
    const visuals = card.mediaItems ?? [];

    expect(card.title.zh).toContain('快手');
    expect(card.mediaKind).toBe('gallery');
    expect(visuals).toHaveLength(8);
    expect(visuals.map(({ kind }) => kind)).toEqual(Array(8).fill('image'));
    expect(new Set(visuals.map(({ src }) => src)).size).toBe(8);

    for (const visual of visuals) {
      expect(visual.src.startsWith('/assets/projects/kuaishou/')).toBe(true);
      expect(existsSync(join(process.cwd(), 'public', visual.src))).toBe(true);
      expect(visual.label.length).toBeGreaterThan(0);
      expect(visual.badge?.length).toBeGreaterThan(0);
      // A still gallery has no player, so every slide opens its own file.
      expect(visual.action).toBe('查看大图');
    }

    // The two conference posters keep their whole frame instead of being cropped.
    expect(visuals.filter(({ fit }) => fit === 'contain')).toHaveLength(2);
  });

  test('prints the Kuaishou plan and its four articles beside the fifth card', () => {
    const category = portfolioContent.categories.find(({ id }) => id === 'motion-3d')!;
    const card = category.projectShowcases?.find(({ code }) => code === '05')!;
    const links = card.links ?? [];

    expect(links).toHaveLength(5);
    expect(links.map(({ label }) => label)).toEqual([
      '小红书运营规划', 'KMP 沙龙', 'NeurIPS 论文', '推荐沙龙', 'ICCV 论文',
    ]);
    expect(links.map(({ href }) => href)).toEqual([
      '/assets/projects/kuaishou/kuaishou-xiaohongshu-plan-2026.pdf',
      'https://mp.weixin.qq.com/s/91OBQcyL5LPOn9KbMg77IA',
      'https://mp.weixin.qq.com/s/rm3R5qWY4vgf85L0pcBpOw',
      'https://mp.weixin.qq.com/s/Jz7sDbB-uBfd5fu9Xnis9g',
      'https://mp.weixin.qq.com/s/AM6y6-zav4taW7j72urk_w',
    ]);
    // The plan ships with the site, so the deck can open it offline.
    expect(existsSync(join(process.cwd(), 'public', links[0]!.href))).toBe(true);
    expect(links[0]!.action).toBe('查看策划案');
    // Five different sources, each with its full headline for the tooltip.
    expect(new Set(links.map(({ href }) => href)).size).toBe(5);
    for (const link of links) {
      expect(link.headline?.length).toBeGreaterThan(6);
    }
  });

  test('collects the campus competition entries and their awards on the seventh card', () => {
    const category = portfolioContent.categories.find(({ id }) => id === 'motion-3d')!;
    const card = category.projectShowcases?.find(({ code }) => code === '07')!;
    const entries = card.mediaItems ?? [];

    expect(card.title.zh).toContain('参赛');
    expect(card.mediaKind).toBe('gallery');
    expect(entries).toHaveLength(9);
    expect(entries.every(({ kind }) => kind === 'image')).toBe(true);
    expect(new Set(entries.map(({ src }) => src)).size).toBe(9);

    for (const entry of entries) {
      expect(entry.src.startsWith('/assets/projects/awards/')).toBe(true);
      expect(existsSync(join(process.cwd(), 'public', entry.src))).toBe(true);
      // Every clip carries the contest it was made for as its tab label.
      expect(entry.label.length).toBeGreaterThan(1);
      expect(entry.alt.length).toBeGreaterThan(4);
      expect(entry.action).toBe('查看大图');
    }

    // Seven of the nine entries are supplied as animated clips.
    expect(entries.filter(({ src }) => src.endsWith('.gif'))).toHaveLength(7);
    expect(entries.every(({ fit }) => fit === 'cover')).toBe(true);
    expect(card.mediaTabsPosition).toBe('top');
    // Clips are large, so they must not be part of the site's first preload.
    expect(projectShowcaseAssetUrls.some((source) => source.endsWith('.gif'))).toBe(false);
    expect(projectShowcaseAssetUrls).toContain('/assets/projects/awards/07-earthquake-science-talk.jpg');
  });

  test('reprints the Henan TV articles with a link back to each original', () => {
    const category = portfolioContent.categories.find(({ id }) => id === 'motion-3d')!;
    const card = category.projectShowcases?.find(({ code }) => code === '04')!;
    const articles = card.mediaItems ?? [];

    expect(card.title.zh).toContain('河南卫视');
    expect(card.mediaKind).toBe('gallery');
    expect(articles.length).toBeGreaterThanOrEqual(4);
    // Every article keeps its own link button, so any piece opens directly.
    expect(card.sourceList).toBe(true);

    for (const article of articles) {
      expect(article.kind).toBe('image');
      expect(article.src.startsWith('/assets/projects/henan-tv/')).toBe(true);
      expect(existsSync(join(process.cwd(), 'public', article.src))).toBe(true);
      expect(article.href).toMatch(/^https:\/\/mp\.weixin\.qq\.com\/s/);
      expect(article.label.length).toBeGreaterThan(0);
      // The extracted copy is what the slide reprints: headline, account and date.
      expect(article.caption?.length).toBeGreaterThan(4);
      expect(article.meta).toContain('河南卫视');
      expect(article.excerpt?.length).toBeGreaterThan(20);
      expect(article.action).toBe('阅读公众号原文');
    }

    // The same article was linked twice; the deck keeps one slide per piece.
    expect(new Set(articles.map(({ href }) => href)).size).toBe(articles.length);
  });

  test('collects the six 视频号 films on the sixth card, each with its own link', () => {
    const category = portfolioContent.categories.find(({ id }) => id === 'motion-3d')!;
    const card = category.projectShowcases?.find(({ code }) => code === '06')!;
    const films = card.mediaItems ?? [];

    expect(card.title.zh).toBe('新密市融媒体实习');
    expect(card.mediaKind).toBe('gallery');
    // The card prints one button per link instead of a single detail button.
    expect(card.sourceList).toBe(true);
    expect(films).toHaveLength(6);

    for (const film of films) {
      expect(film.kind).toBe('image');
      expect(film.src.startsWith('/assets/projects/henan-tv/')).toBe(true);
      expect(existsSync(join(process.cwd(), 'public', film.src))).toBe(true);
      expect(film.href).toMatch(/^https:\/\/weixin\.qq\.com\/sph\/\w+$/);
      expect(film.caption?.length).toBeGreaterThan(4);
      expect(film.meta).toMatch(/^厮跟着到新密 · 2023\.\d{2}\.\d{2}$/);
      expect(film.excerpt?.length).toBeGreaterThan(20);
      expect(film.action).toBe('查看详情');
      expect(film.label.length).toBeGreaterThan(0);
    }

    // Six different films, one button each.
    expect(new Set(films.map(({ href }) => href)).size).toBe(6);
  });

  test('carries every skill panel from the cycling marketing workbench document', () => {
    const category = portfolioContent.categories.find(({ id }) => id === 'illustration');
    const panels = category?.skillPanels ?? [];

    expect(category?.presentation).toBe('accordion');
    expect(category?.title.zh).toBe('AI作品集');
    expect(panels.map(({ code }) => code)).toEqual(['01', '02', '03', '04', '05']);
    expect(panels.map(({ id }) => id)).toEqual([
      'workbench', 'data-agent', 'task-assistant', 'product-image', 'visual-workflow',
    ]);

    for (const panel of panels) {
      expect(panel.title.zh.length).toBeGreaterThan(0);
      expect(panel.title.en.length).toBeGreaterThan(0);
      expect(panel.tagline.zh.length).toBeGreaterThan(0);
      expect(panel.sections.length).toBeGreaterThanOrEqual(3);
      expect(panel.imageGroups.length).toBeGreaterThanOrEqual(1);
      for (const section of panel.sections) {
        expect(section.label.zh.length).toBeGreaterThan(0);
        expect(section.text.zh.length).toBeGreaterThan(20);
        expect(section.text.en.length).toBeGreaterThan(20);
      }
    }

    // Section order follows the document: 背景 → 解决方案 → 效果.
    for (const panel of panels) {
      expect(panel.sections.map(({ label }) => label.zh)).toEqual(['背景', '解决方案', '效果']);
    }

    const productSkill = panels.find(({ id }) => id === 'product-image')!;
    expect(productSkill.bullets?.items).toHaveLength(5);
    expect(productSkill.imageGroups.map((group) => group.images.length)).toEqual([6, 5]);
  });

  test('ships every skill panel image as a real asset', () => {
    const panels = portfolioContent.categories.find(({ id }) => id === 'illustration')?.skillPanels ?? [];
    const images = panels.flatMap((panel) => panel.imageGroups.flatMap((group) => group.images));
    const sources = [...panels.map((panel) => panel.cover), ...images.map((entry) => entry.src)];

    expect(sources.length).toBeGreaterThan(20);
    for (const source of sources) {
      expect(source.startsWith('/assets/skills/')).toBe(true);
      expect(existsSync(join(process.cwd(), 'public', source))).toBe(true);
    }

    // Only the pictures whose original carries more detail get a second file.
    const fullSources = images.map((entry) => entry.full).filter((value): value is string => value !== undefined);
    expect(fullSources.length).toBeGreaterThan(0);
    for (const source of fullSources) {
      expect(source.startsWith('/assets/skills/full/')).toBe(true);
      expect(existsSync(join(process.cwd(), 'public', source))).toBe(true);
    }
  });

  test('records the natural shape of every gallery screenshot', () => {
    const panels = portfolioContent.categories.find(({ id }) => id === 'illustration')?.skillPanels ?? [];

    for (const panel of panels) {
      for (const group of panel.imageGroups) {
        for (const entry of group.images) {
          expect(entry.aspect, `${panel.id} / ${entry.src}`).toBeGreaterThan(0);
        }
      }
    }
  });

  test('uses the supplied personal introduction content', () => {
    expect(portfolioContent.owner).toEqual({ zh: '韩婧仪', en: 'Ginny' });
    expect(portfolioContent.contact).toBe('17335581033');
    expect(aboutProfile.portraitSrc).toBe('/ginny-han-profile.jpeg');
    expect(aboutProfile.skills).toHaveLength(11);
    expect(aboutProfile.tags).toHaveLength(7);
    expect(aboutProfile.tags).toContain('王者最强王者20星');
  });

  test('provides the five real internship entries used by the corkboard', () => {
    const category = portfolioContent.categories.find(({ id }) => id === 'poster-editorial');
    expect(category?.journeyExperiences?.map(({ id }) => id))
      .toEqual(['migu', 'youdao', 'kuaishou', 'jd', 'zhuanzhuan']);
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
