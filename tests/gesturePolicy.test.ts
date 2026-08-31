import { describe, expect, test } from 'vitest';
import { createWheelGestureGate, isHorizontalSwipe } from '../src/experience/gesturePolicy';

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
});
