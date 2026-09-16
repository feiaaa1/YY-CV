import type { ExperienceAction } from './stateMachine';

export function resolveInteractionAction(userData: Record<string, unknown>, projectCount: number): ExperienceAction | null {
  switch (userData.action) {
    case 'enter-directory':
      return { type: 'ENTER_DIRECTORY' };
    case 'open-category':
      return typeof userData.categoryId === 'string' ? { type: 'OPEN_CATEGORY', categoryId: userData.categoryId } : null;
    case 'next-project':
      return { type: 'NEXT_PROJECT', projectCount };
    case 'previous-project':
      return { type: 'PREVIOUS_PROJECT', projectCount };
    case 'select-project-index':
      return typeof userData.projectIndex === 'number'
        && Number.isInteger(userData.projectIndex)
        && userData.projectIndex >= 0
        && userData.projectIndex < projectCount
        ? { type: 'SET_PROJECT_INDEX', projectIndex: userData.projectIndex }
        : null;
    case 'close-detail':
      return { type: 'CLOSE_DETAIL' };
    case 'finish':
      return { type: 'FINISH' };
    case 'restart':
      return { type: 'RESTART' };
    case 'select-journey-station':
      return typeof userData.stationIndex === 'number'
        && Number.isInteger(userData.stationIndex)
        && userData.stationIndex >= 0
        && userData.stationIndex < projectCount
        ? { type: 'SELECT_JOURNEY_STATION', stationIndex: userData.stationIndex }
        : null;
    case 'close-journey-popup':
      return { type: 'CLOSE_JOURNEY_POPUP' };
    default:
      return null;
  }
}
