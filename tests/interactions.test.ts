import { describe, expect, test } from 'vitest';
import { resolveInteractionAction } from '../src/experience/interactions';
import experienceSource from '../src/experience/PortfolioExperience.ts?raw';

function getMethodBody(source: string, signature: string): string {
  const start = source.indexOf(signature);
  if (start < 0) throw new Error(`Could not find ${signature}`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;

  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(bodyStart + 1, index);
  }

  throw new Error(`Could not find the end of ${signature}`);
}

describe('scene interaction mapping', () => {
  test('maps Three.js target metadata to state-machine actions', () => {
    expect(resolveInteractionAction({ action: 'enter-directory' }, 3)).toEqual({ type: 'ENTER_DIRECTORY' });
    expect(resolveInteractionAction({ action: 'open-category', categoryId: 'brand' }, 3)).toEqual({ type: 'OPEN_CATEGORY', categoryId: 'brand' });
    expect(resolveInteractionAction({ action: 'next-project' }, 3)).toEqual({ type: 'NEXT_PROJECT', projectCount: 3 });
    expect(resolveInteractionAction({ action: 'previous-project' }, 3)).toEqual({ type: 'PREVIOUS_PROJECT', projectCount: 3 });
    expect(resolveInteractionAction({ action: 'select-project-index', projectIndex: 1 }, 3)).toEqual({
      type: 'SET_PROJECT_INDEX', projectIndex: 1,
    });
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
    expect(resolveInteractionAction({ action: 'select-project-index', projectIndex: 4 }, 4)).toBeNull();
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
    expect(experienceSource).toMatch(/destroy\(\): void \{\s*if \(this\.destroyed\) return;\s*this\.destroyed = true;\s*this\.stopAnimation\(\);\s*this\.resetGestureState\(\)/);
  });

  test('cancels an owned pointer interaction before it can navigate or activate targets', () => {
    const finishPointerInteraction = getMethodBody(experienceSource, 'private finishPointerInteraction');
    const cancelledReturn = finishPointerInteraction.indexOf('if (cancelled) return;');
    const navigation = finishPointerInteraction.indexOf("type: dx < 0 ? 'NEXT_PROJECT' : 'PREVIOUS_PROJECT'");
    const activation = finishPointerInteraction.indexOf('this.activateTarget(hit);');

    expect(finishPointerInteraction).toMatch(/cancelled\s*\?\s*this\.pointerSession\.cancel\(event\.pointerId\)/);
    expect(cancelledReturn).toBeGreaterThanOrEqual(0);
    expect(navigation).toBeGreaterThan(cancelledReturn);
    expect(activation).toBeGreaterThan(cancelledReturn);
  });

  test('cleans up pointer drag state after every terminal interaction', () => {
    const finishPointerInteraction = getMethodBody(experienceSource, 'private finishPointerInteraction');
    const resetPointerInteraction = getMethodBody(experienceSource, 'private resetPointerInteraction');

    expect(finishPointerInteraction).toMatch(/finally\s*\{\s*this\.resetPointerInteraction\(event\.pointerId\);\s*\}/);
    expect(resetPointerInteraction).toMatch(/this\.dragDistance = 0;/);
    expect(resetPointerInteraction).toMatch(/this\.detailHandle\.root\.userData\.dragRotation = \{ x: 0, y: 0 \};/);
  });

  test('routes the exact hovered Three.js target to its owning model', () => {
    const pointerMove = getMethodBody(experienceSource, 'private readonly onPointerMove');

    expect(pointerMove).toMatch(/this\.hoveredHandle\?\.actions\.setHoveredTarget\(null\);/);
    expect(pointerMove).toMatch(/owner\?\.actions\.setHoveredTarget\(hit\);/);
  });

  test('activates the about expand control through its owning model action', () => {
    const activateTarget = getMethodBody(experienceSource, 'private activateTarget');

    expect(activateTarget).toMatch(/target\.userData\.action === 'toggle-about-expanded'/);
    expect(activateTarget).toMatch(/this\.targetOwners\.get\(target\)\?\.actions\.toggleExpanded\(\);/);
  });

  test('uses a white scene background for the internship corkboard', () => {
    expect(experienceSource).toMatch(/category\.presentation === 'journey'\s*\? '#FFFFFF'/);
  });
});
