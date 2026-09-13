import type { EducationExperience, EducationSection } from '../content/education';
import type { ScrapbookPage } from '../content/types';
import { wrapMeasuredText, type TextMeasure } from '../three/textLayout';

export const educationFontFamily = '"Microsoft YaHei", "PingFang SC", sans-serif';
export type EducationLine = { text: string; y: number; kind: 'heading' | 'body'; marker?: string };
export type EducationSpread = { experience: EducationExperience; lines: EducationLine[]; continuation: number };

export function measureEducationText(text: string): number {
  return Array.from(text).reduce((width, char) => width + (/[^\x00-\xff]/.test(char) ? 40 : 25), 0);
}

function browserMeasure(): TextMeasure {
  if (typeof document === 'undefined') return measureEducationText;
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return measureEducationText;
  context.font = `500 40px ${educationFontFamily}`;
  return (text) => context.measureText(text).width;
}

export function paginateEducationBlocks(sections: EducationSection[], measure: TextMeasure): EducationLine[][] {
  const pages: EducationLine[][] = [];
  let lines: EducationLine[] = [];
  let y = 340;
  const flush = () => {
    if (lines.length) pages.push(lines);
    lines = [];
    y = 340;
  };
  const heading = (title: string) => {
    lines.push({ text: title, y, kind: 'heading' });
    y += 90;
  };
  for (const section of sections) {
    if (!section.items.length) continue;
    const firstLineCount = wrapMeasuredText(section.items[0]!, 1000, measure, Number.MAX_SAFE_INTEGER).length;
    if (y + 90 + (Math.min(firstLineCount, 13) - 1) * 62 > 1220) flush();
    heading(section.title);
    section.items.forEach((item, index) => {
      const wrapped = wrapMeasuredText(item, 1000, measure, Number.MAX_SAFE_INTEGER);
      // Move whole entries when they fit on a fresh page; split only unusually long entries.
      if (y + (wrapped.length - 1) * 62 > 1220 && wrapped.length <= 13) {
        flush();
        heading(`${section.title} · 续`);
      }
      wrapped.forEach((text, lineIndex) => {
        if (y > 1220) {
          flush();
          heading(`${section.title} · 续`);
        }
        lines.push({ text, y, kind: 'body', marker: lineIndex === 0 ? String(index + 1).padStart(2, '0') : undefined });
        y += 62;
      });
      y += 30;
    });
    y += 30;
  }
  flush();
  return pages;
}

export function createEducationPages(experiences: EducationExperience[], measure: TextMeasure = browserMeasure()): ScrapbookPage[] {
  return experiences.flatMap((experience, index) => paginateEducationBlocks(experience.sections, measure).map((lines, continuation) => ({
    id: `${experience.id}-${continuation + 1}`,
    title: { zh: experience.school, en: 'Learning Journey' },
    subtitle: { zh: `${experience.period} · ${experience.major}`, en: experience.period },
    kicker: 'EDUCATION / 学习经历',
    palette: (index === 0 ? ['#F5F2E9', '#BCD6BB', '#EDBCBE'] : ['#F5F2E9', '#BDCEE8', '#E8CA88']) as [string, string, string],
    motif: 'intro' as const,
    education: { experience, lines, continuation },
  })));
}
