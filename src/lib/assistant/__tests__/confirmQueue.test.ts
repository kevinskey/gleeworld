import { describe, it, expect } from 'vitest';
import { ConfirmActionQueue } from '../confirmQueue';
import type { AssistantAction } from '../types';

const sms: AssistantAction = { tool: 'send_sms', args: { message: 'hi sarah' }, confirm: true };
const email: AssistantAction = { tool: 'send_email', args: { subject: 'hi' }, confirm: true };
const openPage: AssistantAction = { tool: 'open_page', args: { key: 'home' }, confirm: false };

describe('ConfirmActionQueue', () => {
  it('register surfaces the first confirm action and all non-confirm actions', () => {
    const q = new ConfirmActionQueue();
    const { first, autoRun } = q.register('m1', [openPage, sms, email]);
    expect(first).toBe(sms);
    expect(autoRun).toEqual([openPage]);
  });

  it('register with no confirm actions returns undefined first', () => {
    const q = new ConfirmActionQueue();
    const { first, autoRun } = q.register('m1', [openPage]);
    expect(first).toBeUndefined();
    expect(autoRun).toEqual([openPage]);
  });

  it('next returns the queued second confirm action after the first resolves', () => {
    const q = new ConfirmActionQueue();
    q.register('m1', [sms, email]);
    const next = q.next('m1', 'm2');
    expect(next).toBe(email);
  });

  it('next returns undefined when nothing was queued', () => {
    const q = new ConfirmActionQueue();
    q.register('m1', [sms]);
    expect(q.next('m1', 'm2')).toBeUndefined();
  });

  it('re-keys a remaining tail of 2+ so a third action can still be advanced', () => {
    const third: AssistantAction = { tool: 'send_sms', args: { message: 'third' }, confirm: true };
    const q = new ConfirmActionQueue();
    q.register('m1', [sms, email, third]);
    const second = q.next('m1', 'm2');
    expect(second).toBe(email);
    // m1's queue should be gone; the tail (third) now lives under m2.
    expect(q.next('m1', 'x')).toBeUndefined();
    const last = q.next('m2', 'm3');
    expect(last).toBe(third);
  });

  it('clear drops all queued state', () => {
    const q = new ConfirmActionQueue();
    q.register('m1', [sms, email]);
    q.clear();
    expect(q.next('m1', 'm2')).toBeUndefined();
  });
});
