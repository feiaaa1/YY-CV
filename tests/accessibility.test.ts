import { describe, expect, test } from 'vitest';
import { describeScreen } from '../src/experience/accessibility';
import { portfolioContent } from '../src/content/portfolio';
import { createExperienceState, reduceExperience, type ExperienceState } from '../src/experience/stateMachine';

const scrapbookId = 'ui-web';
const journeyId = 'poster-editorial';
const bookId = 'illustration';
const aboutId = 'brand';

function stateOn(categoryId: string, overrides: Partial<ExperienceState> = {}): ExperienceState {
  const base = reduceExperience(createExperienceState(false), { type: 'OPEN_CATEGORY', categoryId });
  return { ...base, ...overrides };
}

function labels(state: ExperienceState): string[] {
  return describeScreen(portfolioContent, state).controls.map((control) => control.label);
}

describe('screen semantics', () => {
  test('describes the cover as an e-commerce operations portfolio', () => {
    const descriptor = describeScreen(portfolioContent, createExperienceState(false));

    expect(descriptor.heading).toBe('电商运营作品集 / E-COMMERCE PORTFOLIO');
    expect(descriptor.details).toContain('韩婧仪，电商运营');
  });

  test('exposes a heading and the contact string on the thanks screen', () => {
    const state = reduceExperience(createExperienceState(false), { type: 'FINISH' });
    const descriptor = describeScreen(portfolioContent, state);

    expect(descriptor.heading).toBeTruthy();
    expect(descriptor.details.join(' ')).toContain(portfolioContent.contact);
    expect(descriptor.controls.map((control) => control.action.type)).toEqual(['RESTART']);
  });

  test('describes the visible project rather than only its index', () => {
    const state = stateOn(bookId, { projectIndex: 1 });
    const category = portfolioContent.categories.find((item) => item.id === bookId)!;
    const project = category.projects[1]!;
    const details = describeScreen(portfolioContent, state).details.join(' ');

    expect(details).toContain(project.title.zh);
    expect(details).toContain(project.summary.zh);
    expect(details).toContain(project.year);
  });

  test('describes the selected journey station and its company', () => {
    const category = portfolioContent.categories.find((item) => item.id === journeyId)!;
    const experience = category.journeyExperiences![2]!;
    const state = stateOn(journeyId, { projectIndex: 2, selectedJourneyStation: 2 });
    const details = describeScreen(portfolioContent, state).details.join(' ');

    expect(details).toContain(experience.company.zh);
    expect(details).toContain(experience.role.zh);
    expect(details).toContain(experience.period);
  });

  test('omits the scrapbook previous control on the first page', () => {
    const control = labels(stateOn(scrapbookId, { projectIndex: 0 }));

    expect(control).not.toContain('上一个项目');
    expect(control).toContain('下一个项目');
  });

  test('omits the scrapbook next control on the last page', () => {
    const category = portfolioContent.categories.find((item) => item.id === scrapbookId)!;
    const lastIndex = category.scrapbookPages!.length - 1;
    const control = labels(stateOn(scrapbookId, { projectIndex: lastIndex }));

    expect(control).toContain('上一个项目');
    expect(control).not.toContain('下一个项目');
  });

  test('keeps both paging controls for cyclic book and ticket presentations', () => {
    for (const index of [0, 2]) {
      const control = labels(stateOn(bookId, { projectIndex: index }));

      expect(control).toContain('上一个项目');
      expect(control).toContain('下一个项目');
    }
  });

  test('offers no paging controls for the about presentation', () => {
    const control = labels(stateOn(aboutId));

    expect(control).not.toContain('上一个项目');
    expect(control).not.toContain('下一个项目');
    expect(control).toContain('关闭详情');
  });

  test('offers a station control per journey experience and a way back once open', () => {
    const category = portfolioContent.categories.find((item) => item.id === journeyId)!;
    const closed = labels(stateOn(journeyId, { selectedJourneyStation: null }));
    const open = labels(stateOn(journeyId, { projectIndex: 1, selectedJourneyStation: 1 }));

    expect(closed.filter((label) => label.startsWith('查看站点'))).toHaveLength(category.journeyExperiences!.length);
    expect(closed).not.toContain('返回旅途地图');
    expect(open).toContain('返回旅途地图');
  });

  test('ignores a selected category that is not present in the content', () => {
    const state = { ...stateOn(bookId), selectedCategoryId: 'missing-category' };
    const descriptor = describeScreen(portfolioContent, state);

    expect(descriptor.controls.map((control) => control.label)).toContain('关闭详情');
    expect(descriptor.details.join(' ')).not.toContain('undefined');
  });
});
