import { describe, expect, test } from 'vitest';
import { describeScreen } from '../src/experience/accessibility';
import { portfolioContent } from '../src/content/portfolio';
import { createExperienceState, reduceExperience, type ExperienceState } from '../src/experience/stateMachine';

const scrapbookId = 'ui-web';
const journeyId = 'poster-editorial';
const projectsId = 'motion-3d';
const accordionId = 'illustration';
const aboutId = 'brand';

function stateOn(categoryId: string, overrides: Partial<ExperienceState> = {}): ExperienceState {
  const base = reduceExperience(createExperienceState(false), { type: 'OPEN_CATEGORY', categoryId });
  return { ...base, ...overrides };
}

function labels(state: ExperienceState): string[] {
  return describeScreen(portfolioContent, state).controls.map((control) => control.label);
}

describe('screen semantics', () => {
  test('describes the cover with the owner name and the portfolio title', () => {
    const descriptor = describeScreen(portfolioContent, createExperienceState(false));

    expect(descriptor.heading).toBe('作品集 / PORTFOLIO');
    expect(descriptor.details).toContain('韩婧仪 / Ginny');
  });

  test('exposes a heading and the contact string on the thanks screen', () => {
    const state = reduceExperience(createExperienceState(false), { type: 'FINISH' });
    const descriptor = describeScreen(portfolioContent, state);

    expect(descriptor.heading).toBeTruthy();
    expect(descriptor.details.join(' ')).toContain(portfolioContent.contact);
    expect(descriptor.controls.map((control) => control.action.type)).toEqual(['RESTART']);
  });

  test('describes every card of the project deck rather than only an index', () => {
    const category = portfolioContent.categories.find((item) => item.id === projectsId)!;
    const showcase = category.projectShowcases![1]!;
    const details = describeScreen(portfolioContent, stateOn(projectsId)).details.join(' ');

    expect(details).toContain(showcase.title.zh);
    expect(details).toContain(showcase.summary.zh);
    expect(details).toContain(showcase.year);
  });

  test('describes the internship corkboard without the removed station content', () => {
    const category = portfolioContent.categories.find((item) => item.id === journeyId)!;
    const state = stateOn(journeyId);
    const details = describeScreen(portfolioContent, state).details.join(' ');

    expect(details).toContain(category.title.zh);
    expect(details).toContain('软木板');
  });

  test('offers direct bachelor and master controls on the first education page', () => {
    const control = labels(stateOn(scrapbookId, { projectIndex: 0 }));

    expect(control).toEqual(['本科', '硕士', '关闭详情']);
  });

  test('offers the same direct degree controls on the last education page', () => {
    const category = portfolioContent.categories.find((item) => item.id === scrapbookId)!;
    const lastIndex = category.scrapbookPages!.length - 1;
    const control = labels(stateOn(scrapbookId, { projectIndex: lastIndex }));

    expect(control).toEqual(['本科', '硕士', '关闭详情']);
  });

  test('keeps the scroll-driven project deck free of paging controls', () => {
    const control = labels(stateOn(projectsId, { projectIndex: 2 }));

    expect(control).not.toContain('上一个项目');
    expect(control).not.toContain('下一个项目');
    expect(control).toEqual(['关闭详情']);
  });

  test('lists the skill panels and keeps the accordion free of paging controls', () => {
    const category = portfolioContent.categories.find((item) => item.id === accordionId)!;
    const descriptor = describeScreen(portfolioContent, stateOn(accordionId));

    expect(descriptor.details[0]).toBe(`${category.title.zh} / ${category.title.en}`);
    for (const panel of category.skillPanels!) {
      expect(descriptor.details.join(' ')).toContain(panel.title.zh);
    }
    expect(descriptor.controls.map((control) => control.action.type)).toEqual(['CLOSE_DETAIL']);
  });

  test('offers no paging controls for the about presentation', () => {
    const control = labels(stateOn(aboutId));

    expect(control).not.toContain('上一个项目');
    expect(control).not.toContain('下一个项目');
    expect(control).toContain('关闭详情');
  });

  test('offers only the close control for the internship corkboard', () => {
    const control = labels(stateOn(journeyId));

    expect(control).toEqual(['关闭详情']);
  });

  test('describes the selected internship and offers a popup close control', () => {
    const state = stateOn(journeyId, { projectIndex: 3, selectedJourneyStation: 3 });
    const descriptor = describeScreen(portfolioContent, state);

    expect(descriptor.status).toContain('京东');
    expect(descriptor.details.join(' ')).toContain('采销');
    expect(descriptor.controls.map(({ label }) => label)).toEqual(['关闭实习详情', '关闭详情']);
  });

  test('ignores a selected category that is not present in the content', () => {
    const state = { ...stateOn(projectsId), selectedCategoryId: 'missing-category' };
    const descriptor = describeScreen(portfolioContent, state);

    expect(descriptor.controls.map((control) => control.label)).toContain('关闭详情');
    expect(descriptor.details.join(' ')).not.toContain('undefined');
  });
});
