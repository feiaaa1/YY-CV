import { gsap } from 'gsap';

export type TimelineBuild = (timeline: gsap.core.Timeline) => void | gsap.core.Timeline;

export type TimelineController = {
  readonly locked: boolean;
  run(build: TimelineBuild): Promise<void>;
  killActiveTimeline(): void;
};

export function createTimelineController(options: { reducedMotion: boolean }): TimelineController {
  let active: gsap.core.Timeline | null = null;
  let settleActive: (() => void) | null = null;

  const settle = () => {
    const resolve = settleActive;
    settleActive = null;
    active = null;
    resolve?.();
  };

  const killActiveTimeline = () => {
    active?.kill();
    settle();
  };

  return {
    get locked() { return active !== null; },
    run(build) {
      killActiveTimeline();
      return new Promise<void>((resolve) => {
        settleActive = resolve;
        const timeline = gsap.timeline({
          paused: true,
          defaults: {
            duration: options.reducedMotion ? 0.001 : 0.62,
            ease: options.reducedMotion ? 'none' : 'power3.inOut',
          },
          onComplete: settle,
        });
        active = timeline;
        build(timeline);
        if (options.reducedMotion) {
          queueMicrotask(() => {
            if (active === timeline) timeline.progress(1);
          });
        } else timeline.play(0);
      });
    },
    killActiveTimeline,
  };
}
