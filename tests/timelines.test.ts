import { describe, expect, test } from 'vitest';
import { createTimelineController } from '../src/animation/timelines';

describe('GSAP timeline controller', () => {
  test('locks while a timeline runs and unlocks after reduced-motion completion', async () => {
    const subject = { x: 0 };
    const controller = createTimelineController({ reducedMotion: true });
    const running = controller.run((timeline) => timeline.to(subject, { x: 2 }));

    expect(controller.locked).toBe(true);
    await running;
    expect(controller.locked).toBe(false);
    expect(subject.x).toBe(2);
  });

  test('interrupts the previous transition before starting another', async () => {
    const subject = { x: 0 };
    const controller = createTimelineController({ reducedMotion: true });
    const first = controller.run((timeline) => timeline.to(subject, { x: 1 }));
    const second = controller.run((timeline) => timeline.to(subject, { x: 3 }));

    await Promise.all([first, second]);
    expect(subject.x).toBe(3);
    expect(controller.locked).toBe(false);
  });
});
