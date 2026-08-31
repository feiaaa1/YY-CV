import { describe, expect, test } from 'vitest';
import {
  createPointerSession,
  createWheelGestureGate,
  isHorizontalSwipe,
  isPageablePresentation,
  normalizeWheelDelta,
} from '../src/experience/gesturePolicy';

describe('gesture policy', () => {
  test('accepts intentional horizontal swipes only', () => {
    expect(isHorizontalSwipe({ dx: -80, dy: 18 })).toBe(true);
    expect(isHorizontalSwipe({ dx: -80, dy: 140 })).toBe(false);
    expect(isHorizontalSwipe({ dx: 40, dy: 2 })).toBe(false);
  });

  test('emits once for a wheel burst and resets after inactivity', () => {
    const gate = createWheelGestureGate({ threshold: 24, cooldownMs: 450, idleResetMs: 180 });

    expect(gate.push(30, 0)).toBe(1);
    expect(gate.push(30, 40)).toBe(0);
    expect(gate.push(30, 500)).toBe(1);
    gate.reset();
    expect(gate.push(-30, 510)).toBe(-1);
  });

  test('does not repeat a continuous wheel burst after its cooldown expires', () => {
    const gate = createWheelGestureGate({ threshold: 24, cooldownMs: 450, idleResetMs: 180 });

    expect(gate.push(30, 0)).toBe(1);
    expect(gate.push(30, 100)).toBe(0);
    expect(gate.push(30, 200)).toBe(0);
    expect(gate.push(30, 300)).toBe(0);
    expect(gate.push(30, 400)).toBe(0);
    expect(gate.push(30, 500)).toBe(0);
    expect(gate.push(30, 700)).toBe(1);
  });

  test('keeps the first pointer as session owner until that pointer ends or resets', () => {
    const session = createPointerSession<{ pointerId: number; label: string }>();
    const first = { pointerId: 1, label: 'first' };

    expect(session.start(first)).toBe(true);
    expect(session.start({ pointerId: 2, label: 'second' })).toBe(false);
    expect(session.owns(1)).toBe(true);
    expect(session.owns(2)).toBe(false);
    expect(session.get(1)).toEqual(first);
    expect(session.get(2)).toBeNull();
    expect(session.end(2)).toBeNull();
    expect(session.owns(1)).toBe(true);
    expect(session.end(1)).toEqual(first);
    expect(session.isActive()).toBe(false);
  });

  test('clears an owned pointer session on cancellation or reset', () => {
    const session = createPointerSession<{ pointerId: number }>();

    session.start({ pointerId: 3 });
    expect(session.cancel(3)).toEqual({ pointerId: 3 });
    expect(session.isActive()).toBe(false);
    session.start({ pointerId: 4 });
    expect(session.reset()).toEqual({ pointerId: 4 });
    expect(session.isActive()).toBe(false);
  });

  test('normalizes wheel deltas and marks only project presentations pageable', () => {
    expect(normalizeWheelDelta(12, 0, 700)).toBe(12);
    expect(normalizeWheelDelta(3, 1, 700)).toBe(48);
    expect(normalizeWheelDelta(-1, 2, 700)).toBe(-700);
    expect(isPageablePresentation('book')).toBe(true);
    expect(isPageablePresentation('scrapbook')).toBe(true);
    expect(isPageablePresentation('about')).toBe(false);
    expect(isPageablePresentation('journey')).toBe(false);
  });
});
