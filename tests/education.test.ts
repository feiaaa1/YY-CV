import { describe, expect, test } from 'vitest';
import { educationExperiences } from '../src/content/education';
import { createEducationPages, paginateEducationBlocks } from '../src/education/layout';

const measure = (text: string) => Array.from(text).length * 40;

describe('education content and pagination', () => {
  test('preserves both supplied schools and removes only the confirmed duplicate award', () => {
    expect(educationExperiences.map((entry) => entry.school)).toEqual(['天津仁爱学院', '北京体育大学（211）']);
    const content = JSON.stringify(educationExperiences);
    expect(content.match(/校长奖学金/g)).toHaveLength(1);
    for (const text of ['3.94/4', '1/94', '连续四年排名第一', '3.84/4', '5/50', '2027.7', '米兰冬奥会赛事运营']) {
      expect(content).toContain(text);
    }
  });

  test('wraps long Chinese text, paginates without losing text, and keeps lines within the page', () => {
    const text = '这是需要完整保留的中文学习经历与奖项。'.repeat(40);
    const pages = paginateEducationBlocks([{ title: '所获奖项', items: [text] }], measure);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flatMap((page) => page.filter((line) => line.kind === 'body').map((line) => line.text)).join('')).toBe(text);
    for (const page of pages) {
      expect(page[0]?.kind).toBe('heading');
      for (const line of page) {
        expect(measure(line.text)).toBeLessThanOrEqual(1000);
        expect(line.y).toBeLessThanOrEqual(1220);
      }
    }
  });

  test('creates content-driven spreads for both schools with all academic work and awards', () => {
    const pages = createEducationPages(educationExperiences, measure);
    expect(new Set(pages.map((page) => page.education?.experience.school)).size).toBe(2);
    expect(pages.every((page) => page.education?.lines.length)).toBe(true);
    const text = pages.flatMap((page) => page.education?.lines.map((line) => line.text) ?? []).join('');
    for (const experience of educationExperiences) {
      for (const section of experience.sections) for (const item of section.items) expect(text).toContain(item);
    }
  });
});
