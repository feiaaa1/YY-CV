export type TransitionHooks = {
  lock: (locked: boolean) => void;
  announce: (message: string) => void;
  onError: (error: unknown) => void;
  failureMessage?: string;
};

export type TransitionOperation = () => Promise<void> | void;
export type TransitionRecovery = () => Promise<void> | void;

export async function runLockedTransition(
  operation: TransitionOperation,
  recovery: TransitionRecovery,
  hooks: TransitionHooks,
): Promise<boolean> {
  hooks.lock(true);
  try {
    await operation();
    return true;
  } catch (error) {
    hooks.onError(error);
    try {
      await recovery();
    } catch (recoveryError) {
      hooks.onError(recoveryError);
    }
    if (hooks.failureMessage) hooks.announce(hooks.failureMessage);
    return false;
  } finally {
    hooks.lock(false);
  }
}
