import { describe, expect, test } from 'vitest';
import {
  findSheetTextPage,
  SHEET_PLATE,
  SHEET_TEXT_HEIGHT,
  SHEET_TEXT_WIDTH,
} from '../src/content/internshipSheetText';
import { portfolioContent } from '../src/content/portfolio';

const stations = portfolioContent.categories.find((category) => category.id === 'poster-editorial')!
  .journeyExperiences!;

describe('vector internship sheets', () => {
  test('ships every internship sheet as the shared text-free plate plus real text', () => {
    expect(stations.map((station) => station.id)).toEqual(['migu', 'youdao', 'kuaishou', 'jd', 'zhuanzhuan']);
    for (const station of stations) {
      const page = findSheetTextPage(station.id);
      // The stations all reuse 咪咕's clean plate instead of generating one each.
      expect(page?.background).toBe(SHEET_PLATE);
      expect(page?.blocks.length).toBeGreaterThan(0);
    }
  });

  test('gives the Kuaishou AI and community sections a clear vertical gap', () => {
    const page = findSheetTextPage('kuaishou')!;
    const headings = page.blocks.filter((block) => block.family === 'sans' && block.weight === 800);
    const ai = headings.find((block) => block.text === 'AI辅助内容生产')!;
    const community = headings.find((block) => block.text === '社区运营')!;
    const activity = headings.find((block) => block.text === '活动策划')!;

    expect(community.top - ai.top).toBeGreaterThanOrEqual(196);
    expect(activity.top - community.top).toBeGreaterThanOrEqual(196);
  });

  test('keeps every block inside the sheet bounds', () => {
    for (const station of stations) {
      const page = findSheetTextPage(station.id)!;
      for (const block of page.blocks) {
        expect(block.left).toBeGreaterThanOrEqual(0);
        expect(block.top).toBeGreaterThanOrEqual(0);
        expect(block.left + block.width).toBeLessThanOrEqual(SHEET_TEXT_WIDTH + 0.001);
        expect(block.top + block.lineHeight * 5).toBeLessThanOrEqual(SHEET_TEXT_HEIGHT);
        expect(block.size).toBeGreaterThan(8);
        expect(block.lineHeight).toBeGreaterThanOrEqual(block.size);
      }
    }
  });

  test('gives every sheet a titled header, a tagline and a numbered footer', () => {
    stations.forEach((station, index) => {
      const page = findSheetTextPage(station.id)!;
      const centred = page.blocks.filter((block) => block.align === 'center');
      expect(centred.map((block) => block.text)).toEqual([
        station.company.zh,
        station.role.zh,
        station.period.replace(/\s*—\s*/, '   -   '),
      ]);
      const tagline = page.blocks.find((block) => block.align === 'right')!;
      expect(tagline.text).toBe(tagline.text.toUpperCase());
      const footer = page.blocks[page.blocks.length - 1]!;
      expect(footer.text).toBe(`INTERNSHIP JOURNAL   /   0${index + 1}`);
    });
  });

  test('carries each experience as heading and body pair, in reading order', () => {
    for (const station of stations) {
      const page = findSheetTextPage(station.id)!;
      const headings = page.blocks.filter((block) => (
        block.family === 'sans' && block.align === 'left' && block.size >= 27
      ));
      const bodies = page.blocks.filter((block) => (
        block.family === 'serif' && block.align === 'left' && block.size >= 20
      ));
      expect(headings.length).toBeGreaterThanOrEqual(3);
      expect(bodies).toHaveLength(headings.length);
      expect(bodies.every((block) => block.text.length > 40)).toBe(true);
      headings.forEach((heading, index) => {
        const body = bodies[index]!;
        expect(body.top).toBeGreaterThan(heading.top);
        expect(body.left).toBe(heading.left);
        const next = headings[index + 1];
        if (next) expect(body.top).toBeLessThan(next.top);
      });
    }
  });
});
