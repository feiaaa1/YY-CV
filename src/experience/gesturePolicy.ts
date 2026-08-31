export type SwipeInput = {
  dx: number;
  dy: number;
  threshold?: number;
  dominance?: number;
};

export function isHorizontalSwipe({ dx, dy, threshold = 48, dominance = 1.2 }: SwipeInput): boolean {
  return Math.abs(dx) >= threshold && Math.abs(dx) >= Math.abs(dy) * dominance;
}

export type PointerSessionSnapshot = { pointerId: number };

export type PointerSession<Snapshot extends PointerSessionSnapshot> = {
  start(snapshot: Snapshot): boolean;
  owns(pointerId: number): boolean;
  get(pointerId: number): Snapshot | null;
  end(pointerId: number): Snapshot | null;
  cancel(pointerId: number): Snapshot | null;
  reset(): Snapshot | null;
  isActive(): boolean;
};

export function createPointerSession<Snapshot extends PointerSessionSnapshot>(): PointerSession<Snapshot> {
  let active: Snapshot | null = null;
  const end = (pointerId: number): Snapshot | null => {
    if (!active || active.pointerId !== pointerId) return null;
    const finished = active;
    active = null;
    return finished;
  };

  return {
    start(snapshot) {
      if (active) return false;
      active = snapshot;
      return true;
    },
    owns(pointerId) {
      return active?.pointerId === pointerId;
    },
    get(pointerId) {
      return active?.pointerId === pointerId ? active : null;
    },
    end,
    cancel: end,
    reset() {
      const previous = active;
      active = null;
      return previous;
    },
    isActive() {
      return active !== null;
    },
  };
}

export function normalizeWheelDelta(deltaY: number, deltaMode: number, pageHeight: number): number {
  if (deltaMode === 1) return deltaY * 16;
  if (deltaMode === 2) return deltaY * pageHeight;
  return deltaY;
}

export function isPageablePresentation(presentation: string | undefined): boolean {
  return !['about', 'journey'].includes(presentation ?? '');
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
