import { describe, expect, it } from 'vitest';
import {
  buildSkillsWorkbenchMarkup,
  groupTileRatio,
  lightboxImageScale,
  SKILLS_PAGE_EYEBROW,
  SKILLS_PAGE_HEADING,
  SKILLS_PAGE_HINT,
  SKILLS_PAGE_HINT_TOUCH,
  SKILLS_PAGE_TITLE,
  tileRatio,
} from '../src/skills/skillsWorkbenchPage';
import { skillPanels } from '../src/content/skillWorkbench';
import { portfolioContent } from '../src/content/portfolio';

describe('skills workbench accordion page', () => {
  it('prints one panel per project from the source document, in order', () => {
    const markup = buildSkillsWorkbenchMarkup();

    expect(markup.match(/data-skills-panel/g)).toHaveLength(skillPanels.length);
    expect(markup.match(/data-skills-toggle/g)).toHaveLength(skillPanels.length);
    expect([...markup.matchAll(/skills-panel__code[^>]*>(\d\d)</g)].map((match) => match[1]))
      .toEqual(skillPanels.map((panel) => panel.code));
    expect(markup.indexOf('data-panel-id="visual-workflow"'))
      .toBeGreaterThan(markup.indexOf('data-panel-id="product-image"'));
  });

  it('gives every panel a toggle that owns its body, and prints the whole document', () => {
    const markup = buildSkillsWorkbenchMarkup();

    for (const panel of skillPanels) {
      expect(markup).toContain(`data-panel-id="${panel.id}"`);
      expect(markup).toContain(`id="skills-body-${panel.id}"`);
      expect(markup).toContain(`aria-controls="skills-body-${panel.id}"`);
      expect(markup).toContain(panel.title.zh);
      expect(markup).toContain(panel.title.en);
      expect(markup).toContain(panel.tagline.zh);
      for (const section of panel.sections) {
        expect(markup).toContain(section.label.zh);
        expect(markup).toContain(section.text.zh);
      }
      for (const item of panel.bullets?.items ?? []) expect(markup).toContain(item.zh);
      for (const group of panel.imageGroups) {
        for (const entry of group.images) expect(markup).toContain(`src="${entry.src}"`);
      }
    }
  });

  it('explains both the hover and the tap gesture and keeps a way back', () => {
    const markup = buildSkillsWorkbenchMarkup();

    expect(markup).toContain(SKILLS_PAGE_TITLE);
    expect(markup).toContain(SKILLS_PAGE_HEADING);
    expect(markup).toContain(SKILLS_PAGE_HINT);
    expect(markup).toContain(SKILLS_PAGE_HINT_TOUCH);
    expect(markup).toContain('data-skills-close');
    expect(markup).toContain('返回作品目录');
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
  });

  it('names the detail page after the folder that opens it', () => {
    const category = portfolioContent.categories.find(({ id }) => id === 'illustration')!;
    const markup = buildSkillsWorkbenchMarkup();

    expect(SKILLS_PAGE_HEADING).toBe(category.title.zh);
    expect(SKILLS_PAGE_EYEBROW).toBe(`04 / ${category.title.en.toUpperCase()}`);
    expect(markup).toContain(`class="skills-page__title">${SKILLS_PAGE_HEADING}<`);
    expect(markup).toContain(`class="skills-page__kicker">${SKILLS_PAGE_EYEBROW}<`);
  });

  it('prints the document copy in Chinese only, without the English parallel text', () => {
    const markup = buildSkillsWorkbenchMarkup();

    for (const panel of skillPanels) {
      for (const section of panel.sections) {
        expect(markup).toContain(section.text.zh);
        expect(markup).not.toContain(section.text.en);
      }
      for (const item of panel.bullets?.items ?? []) {
        expect(markup).not.toContain(item.en);
      }
    }
    expect(markup).not.toContain('skills-section__translation');
    expect(markup).not.toContain('skills-bullets__en');
  });

  it('leaves every collapsed body out of the accessibility tree until it opens', () => {
    const markup = buildSkillsWorkbenchMarkup();

    // The mount routine marks the open panel itself; the markup must not
    // pre-announce one, otherwise a hover would contradict the printed state.
    expect(markup.match(/aria-expanded="false"/g)).toHaveLength(skillPanels.length);
    expect(markup).not.toContain('aria-expanded="true"');
  });

  it('turns every screenshot into a click-to-enlarge preview', () => {
    const markup = buildSkillsWorkbenchMarkup();
    const galleryImages = skillPanels.flatMap((panel) => (
      panel.imageGroups.flatMap((group) => group.images)
    ));

    expect(markup.match(/data-skills-zoom/g)).toHaveLength(galleryImages.length);
    for (const entry of galleryImages) {
      expect(markup).toContain(`data-zoom-src="${entry.src}"`);
    }

    expect(markup).toContain('data-skills-lightbox-image');
    expect(markup).toContain('data-skills-lightbox-caption');
    expect(markup).toContain('data-skills-lightbox-counter');
    expect(markup).toContain('data-skills-lightbox-prev');
    expect(markup).toContain('data-skills-lightbox-next');
    expect(markup).toContain('aria-label="关闭图片"');
  });

  it('prints each screenshot group in one shared shape so its rows line up', () => {
    const markup = buildSkillsWorkbenchMarkup();

    for (const panel of skillPanels) {
      for (const group of panel.imageGroups) {
        const ratio = groupTileRatio(group.images.map((entry) => entry.aspect));
        expect(markup).toContain(`style="--tile-ratio: ${ratio}"`);
      }
    }

    expect(tileRatio(undefined)).toBe('0.800');
    expect(tileRatio(0.2)).toBe('0.620');
    expect(tileRatio(1)).toBe('1.000');
    expect(tileRatio(4)).toBe('1.500');

    // The group shape averages its pictures, staying inside the same band.
    expect(groupTileRatio([])).toBe('0.800');
    expect(groupTileRatio([1, 1])).toBe('1.000');
    expect(groupTileRatio([0.2, 0.2])).toBe('0.620');
    // Each picture is clamped first, then averaged.
    expect(groupTileRatio([1.4, 4])).toBe('1.450');
    expect(groupTileRatio([0.62, 0.62, 1.031])).toBe(tileRatio((0.62 + 0.62 + 1.031) / 3));
  });

  it('prints a previewed picture at 80vw instead of shrinking it to fit', () => {
    const width = 1280;
    const height = 720;
    const target = width * 0.8;

    // A tall screenshot: a full 80vw, scrolling downwards.
    const tall = lightboxImageScale(427, 1600, width, height);
    expect(tall * 427).toBeCloseTo(target, 5);
    expect(tall * 1600).toBeGreaterThan(height);

    // A wide desktop shot: same width, so the whole picture still reads.
    const wide = lightboxImageScale(1500, 916, width, height);
    expect(wide * 1500).toBeCloseTo(target, 5);

    // A small phone screenshot: magnified as far as the source allows, which
    // lands just under 80vw.
    const small = lightboxImageScale(320, 452, width, height);
    expect(small).toBe(3);
    expect(small * 320).toBeLessThanOrEqual(target);

    // Never smaller than a plain fit either, and junk dimensions stay sane.
    expect(lightboxImageScale(4000, 3000, width, height) * 4000).toBeCloseTo(target, 5);
    expect(lightboxImageScale(0, 0, width, height)).toBe(1);
  });
});
