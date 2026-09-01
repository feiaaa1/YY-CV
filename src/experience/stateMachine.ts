export type ExperienceScreen = 'cover' | 'directory' | 'detail' | 'thanks';

export type ExperienceState = {
  screen: ExperienceScreen;
  selectedCategoryId: string | null;
  projectIndex: number;
  selectedJourneyStation: number | null;
  visitedCategoryIds: string[];
  reducedMotion: boolean;
  transitionLocked: boolean;
};

export type ExperienceAction =
  | { type: 'ENTER_DIRECTORY' }
  | { type: 'OPEN_CATEGORY'; categoryId: string }
  | { type: 'NEXT_PROJECT'; projectCount: number }
  | { type: 'PREVIOUS_PROJECT'; projectCount: number }
  | { type: 'SELECT_JOURNEY_STATION'; stationIndex: number }
  | { type: 'SET_PROJECT_INDEX'; projectIndex: number }
  | { type: 'CLOSE_JOURNEY_POPUP' }
  | { type: 'CLOSE_DETAIL' }
  | { type: 'FINISH' }
  | { type: 'RESTART' }
  | { type: 'SET_TRANSITION_LOCK'; locked: boolean };

export const createExperienceState = (reducedMotion: boolean): ExperienceState => ({
  screen: 'cover',
  selectedCategoryId: null,
  projectIndex: 0,
  selectedJourneyStation: null,
  visitedCategoryIds: [],
  reducedMotion,
  transitionLocked: false,
});

export function reduceExperience(state: ExperienceState, action: ExperienceAction): ExperienceState {
  if (action.type !== 'SET_TRANSITION_LOCK' && state.transitionLocked) return state;

  switch (action.type) {
    case 'ENTER_DIRECTORY':
      return { ...state, screen: 'directory', selectedCategoryId: null, projectIndex: 0, selectedJourneyStation: null };
    case 'OPEN_CATEGORY':
      return {
        ...state,
        screen: 'detail',
        selectedCategoryId: action.categoryId,
        projectIndex: 0,
        selectedJourneyStation: null,
        visitedCategoryIds: state.visitedCategoryIds.includes(action.categoryId)
          ? state.visitedCategoryIds
          : [...state.visitedCategoryIds, action.categoryId],
      };
    case 'NEXT_PROJECT':
      return { ...state, projectIndex: action.projectCount > 0 ? (state.projectIndex + 1) % action.projectCount : 0 };
    case 'PREVIOUS_PROJECT':
      return { ...state, projectIndex: action.projectCount > 0 ? (state.projectIndex - 1 + action.projectCount) % action.projectCount : 0 };
    case 'SELECT_JOURNEY_STATION':
      return { ...state, projectIndex: action.stationIndex, selectedJourneyStation: action.stationIndex };
    case 'SET_PROJECT_INDEX':
      return { ...state, projectIndex: action.projectIndex };
    case 'CLOSE_JOURNEY_POPUP':
      return { ...state, projectIndex: 0, selectedJourneyStation: null };
    case 'CLOSE_DETAIL':
      return { ...state, screen: 'directory', selectedCategoryId: null, projectIndex: 0, selectedJourneyStation: null };
    case 'FINISH':
      return { ...state, screen: 'thanks', selectedCategoryId: null, projectIndex: 0, selectedJourneyStation: null };
    case 'RESTART':
      return createExperienceState(state.reducedMotion);
    case 'SET_TRANSITION_LOCK':
      return { ...state, transitionLocked: action.locked };
  }
}
