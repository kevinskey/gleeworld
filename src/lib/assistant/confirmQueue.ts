import type { AssistantAction } from './types';

/**
 * threadReducer's contract is "one pendingAction per assistant message" — a
 * single turn can carry several confirm-gated actions (e.g. "text Sarah and
 * email the board"), but only the first can live on the reply message. This
 * queue holds the rest, keyed by whichever message id is currently showing a
 * pending confirm card, so callers can surface them one at a time as separate
 * assistant messages once the current one resolves (sent or cancelled).
 *
 * No action popped from this queue skips confirmation — `next` only hands
 * back an action for the caller to attach to a *new* pending message; it
 * never executes anything itself.
 */
export class ConfirmActionQueue {
  private queues = new Map<string, AssistantAction[]>();

  /**
   * Split a turn's actions into the one confirm action to show immediately
   * (`first`) and the ones that can run without confirmation (`autoRun`).
   * Any additional confirm actions are stashed against `msgId` for `next`.
   */
  register(msgId: string, actions: AssistantAction[]): { first?: AssistantAction; autoRun: AssistantAction[] } {
    const confirmActions = actions.filter((a) => a.confirm);
    const autoRun = actions.filter((a) => !a.confirm);
    const [first, ...rest] = confirmActions;
    if (rest.length) this.queues.set(msgId, rest);
    return { first, autoRun };
  }

  /**
   * Called once the confirm action shown on `resolvedMsgId` has been sent or
   * cancelled. Pops the next queued confirm action (if any), re-keying any
   * remaining tail under `newMsgId` so it can be advanced again later.
   */
  next(resolvedMsgId: string, newMsgId: string): AssistantAction | undefined {
    const queue = this.queues.get(resolvedMsgId);
    this.queues.delete(resolvedMsgId);
    if (!queue?.length) return undefined;
    const [nextAction, ...rest] = queue;
    if (rest.length) this.queues.set(newMsgId, rest);
    return nextAction;
  }

  /** Drop all queued state — call on thread reset. */
  clear() {
    this.queues.clear();
  }
}
