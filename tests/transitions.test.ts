import { describe, expect, test, vi } from 'vitest';
import { runLockedTransition } from '../src/experience/transitions';

function createHooks() {
  const events: string[] = [];
  return {
    events,
    hooks: {
      lock: (locked: boolean) => events.push(`lock:${locked}`),
      announce: (message: string) => events.push(`announce:${message}`),
      onError: () => events.push('error'),
    },
  };
}

describe('locked transition execution', () => {
  test('locks, runs, and unlocks a successful transition', async () => {
    const { events, hooks } = createHooks();
    const recovery = vi.fn();

    const ok = await runLockedTransition(
      async () => { events.push('operation'); },
      recovery,
      hooks,
    );

    expect(ok).toBe(true);
    expect(events).toEqual(['lock:true', 'operation', 'lock:false']);
    expect(recovery).not.toHaveBeenCalled();
  });

  test('recovers, announces, and still unlocks when the operation rejects', async () => {
    const { events, hooks } = createHooks();

    const ok = await runLockedTransition(
      async () => { throw new Error('boom'); },
      () => { events.push('recovery'); },
      { ...hooks, failureMessage: '场景切换失败，已回到上一个画面。' },
    );

    expect(ok).toBe(false);
    expect(events).toEqual([
      'lock:true',
      'error',
      'recovery',
      'announce:场景切换失败，已回到上一个画面。',
      'lock:false',
    ]);
  });

  test('releases the lock even when recovery itself throws', async () => {
    const { events, hooks } = createHooks();

    const ok = await runLockedTransition(
      async () => { throw new Error('boom'); },
      () => { throw new Error('recovery failed'); },
      hooks,
    );

    expect(ok).toBe(false);
    expect(events.at(-1)).toBe('lock:false');
    expect(events.filter((event) => event === 'lock:false')).toHaveLength(1);
  });

  test('awaits an asynchronous recovery before releasing the lock', async () => {
    const { events, hooks } = createHooks();

    await runLockedTransition(
      async () => { throw new Error('boom'); },
      async () => {
        await Promise.resolve();
        events.push('recovery');
      },
      hooks,
    );

    expect(events.indexOf('recovery')).toBeLessThan(events.indexOf('lock:false'));
  });

  test('reports the original error to the error hook', async () => {
    const failure = new Error('boom');
    const onError = vi.fn();

    await runLockedTransition(
      async () => { throw failure; },
      () => {},
      { lock: () => {}, announce: () => {}, onError },
    );

    expect(onError).toHaveBeenCalledWith(failure);
  });
});
