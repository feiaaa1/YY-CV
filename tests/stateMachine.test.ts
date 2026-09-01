import { describe, expect, test } from 'vitest';
import { createExperienceState, reduceExperience } from '../src/experience/stateMachine';

describe('experience state machine', () => {
  test('moves from cover to directory and opens a category detail', () => {
    const directory = reduceExperience(createExperienceState(false), { type: 'ENTER_DIRECTORY' });
    const detail = reduceExperience(directory, { type: 'OPEN_CATEGORY', categoryId: 'brand' });

    expect(directory.screen).toBe('directory');
    expect(detail).toMatchObject({ screen: 'detail', selectedCategoryId: 'brand', projectIndex: 0 });
    expect(detail.visitedCategoryIds).toEqual(['brand']);
  });

  test('cycles project indices and closes back to the directory', () => {
    let state = createExperienceState(false);
    state = reduceExperience(state, { type: 'ENTER_DIRECTORY' });
    state = reduceExperience(state, { type: 'OPEN_CATEGORY', categoryId: 'ui-web' });
    state = reduceExperience(state, { type: 'NEXT_PROJECT', projectCount: 3 });
    state = reduceExperience(state, { type: 'PREVIOUS_PROJECT', projectCount: 3 });
    state = reduceExperience(state, { type: 'PREVIOUS_PROJECT', projectCount: 3 });
    expect(state.projectIndex).toBe(2);

    state = reduceExperience(state, { type: 'CLOSE_DETAIL' });
    expect(state).toMatchObject({ screen: 'directory', selectedCategoryId: null, projectIndex: 0 });
  });

  test('restarts from thanks while preserving reduced-motion preference', () => {
    let state = createExperienceState(true);
    state = reduceExperience(state, { type: 'ENTER_DIRECTORY' });
    state = reduceExperience(state, { type: 'FINISH' });
    state = reduceExperience(state, { type: 'RESTART' });

    expect(state).toEqual(createExperienceState(true));
  });

  test('tracks a selected journey station without leaving the detail screen', () => {
    let state = createExperienceState(false);
    state = reduceExperience(state, { type: 'ENTER_DIRECTORY' });
    state = reduceExperience(state, { type: 'OPEN_CATEGORY', categoryId: 'poster-editorial' });
    state = reduceExperience(state, { type: 'SELECT_JOURNEY_STATION', stationIndex: 3 });
    expect(state).toMatchObject({
      screen: 'detail', selectedCategoryId: 'poster-editorial', projectIndex: 3,
      selectedJourneyStation: 3,
    });

    state = reduceExperience(state, { type: 'CLOSE_JOURNEY_POPUP' });
    expect(state).toMatchObject({ screen: 'detail', projectIndex: 0, selectedJourneyStation: null });
  });

  test('restores a project index without changing the selected journey station', () => {
    let state = createExperienceState(false);
    state = reduceExperience(state, { type: 'ENTER_DIRECTORY' });
    state = reduceExperience(state, { type: 'OPEN_CATEGORY', categoryId: 'poster-editorial' });
    state = reduceExperience(state, { type: 'SELECT_JOURNEY_STATION', stationIndex: 2 });
    state = reduceExperience(state, { type: 'SET_PROJECT_INDEX', projectIndex: 0 });

    expect(state.projectIndex).toBe(0);
    expect(state.selectedJourneyStation).toBe(2);
  });
});
