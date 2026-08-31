import { describe, expect, test } from 'vitest';
import { resolveInteractionAction } from '../src/experience/interactions';

describe('scene interaction mapping', () => {
  test('maps Three.js target metadata to state-machine actions', () => {
    expect(resolveInteractionAction({ action: 'enter-directory' }, 3)).toEqual({ type: 'ENTER_DIRECTORY' });
    expect(resolveInteractionAction({ action: 'open-category', categoryId: 'brand' }, 3)).toEqual({ type: 'OPEN_CATEGORY', categoryId: 'brand' });
    expect(resolveInteractionAction({ action: 'next-project' }, 3)).toEqual({ type: 'NEXT_PROJECT', projectCount: 3 });
    expect(resolveInteractionAction({ action: 'previous-project' }, 3)).toEqual({ type: 'PREVIOUS_PROJECT', projectCount: 3 });
    expect(resolveInteractionAction({ action: 'close-detail' }, 3)).toEqual({ type: 'CLOSE_DETAIL' });
    expect(resolveInteractionAction({ action: 'finish' }, 3)).toEqual({ type: 'FINISH' });
    expect(resolveInteractionAction({ action: 'restart' }, 3)).toEqual({ type: 'RESTART' });
    expect(resolveInteractionAction({ action: 'select-journey-station', stationIndex: 2 }, 4)).toEqual({
      type: 'SELECT_JOURNEY_STATION', stationIndex: 2,
    });
    expect(resolveInteractionAction({ action: 'close-journey-popup' }, 4)).toEqual({ type: 'CLOSE_JOURNEY_POPUP' });
  });

  test('ignores incomplete or unknown targets', () => {
    expect(resolveInteractionAction({ action: 'open-category' }, 3)).toBeNull();
    expect(resolveInteractionAction({ action: 'something-else' }, 3)).toBeNull();
    expect(resolveInteractionAction({ action: 'select-journey-station' }, 4)).toBeNull();
  });
});
