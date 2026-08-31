export type SwipeInput = {
  dx: number;
  dy: number;
  threshold?: number;
  dominance?: number;
};

export function isHorizontalSwipe({ dx, dy, threshold = 48, dominance = 1.2 }: SwipeInput): boolean {
  return Math.abs(dx) >= threshold && Math.abs(dx) >= Math.abs(dy) * dominance;
}

export type WheelGestureGateOptions = {
  threshold: number;
  cooldownMs: number;
  idleResetMs: number;
};

export type WheelGestureGate = {
  push(deltaY: number, now: number): -1 | 0 | 1;
  reset(): void;
};

export function createWheelGestureGate({ threshold, cooldownMs, idleResetMs }: WheelGestureGateOptions): WheelGestureGate {
  let accumulatedDelta = 0;
  let lastInputAt: number | null = null;
  let cooldownUntil = 0;
  let emittedInBurst = false;

  return {
    push(deltaY, now) {
      if (lastInputAt !== null && now - lastInputAt >= idleResetMs) {
        accumulatedDelta = 0;
        emittedInBurst = false;
      }
      lastInputAt = now;

      if (emittedInBurst || now < cooldownUntil) return 0;

      accumulatedDelta += deltaY;
      if (Math.abs(accumulatedDelta) < threshold) return 0;

      const direction = accumulatedDelta > 0 ? 1 : -1;
      accumulatedDelta = 0;
      cooldownUntil = now + cooldownMs;
      emittedInBurst = true;
      return direction;
    },
    reset() {
      accumulatedDelta = 0;
      lastInputAt = null;
      cooldownUntil = 0;
      emittedInBurst = false;
    },
  };
}
