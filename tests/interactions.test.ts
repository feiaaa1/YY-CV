import { describe, expect, test } from 'vitest';
import { resolveInteractionAction } from '../src/experience/interactions';
import experienceSource from '../src/experience/PortfolioExperience.ts?raw';

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

  test('pairs named canvas interaction listeners with cleanup handlers', () => {
    for (const [event, handler] of [
      ['pointermove', 'onPointerMove'],
      ['pointerdown', 'onPointerDown'],
      ['pointerup', 'onPointerUp'],
      ['pointercancel', 'onPointerCancel'],
      ['lostpointercapture', 'onLostPointerCapture'],
      ['wheel', 'onWheel'],
    ]) {
      expect(experienceSource).toContain(`addEventListener('${event}', this.${handler}`);
      expect(experienceSource).toContain(`removeEventListener('${event}', this.${handler}`);
    }
  });

  test('resets gesture state when detail scenes close, clear, or destroy', () => {
    expect(experienceSource).toMatch(/if \(action\.type === 'CLOSE_DETAIL'\) \{\s*this\.resetGestureState\(\)/);
    expect(experienceSource).toMatch(/private clearDetail\(\): void \{\s*this\.resetGestureState\(\)/);
    expect(experienceSource).toMatch(/destroy\(\): void \{\s*cancelAnimationFrame\(this\.frameId\);\s*this\.resetGestureState\(\)/);
  });
});
