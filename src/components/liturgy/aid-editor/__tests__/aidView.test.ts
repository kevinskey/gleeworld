// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { withFullView, AID_VIEW_ATTR } from '../aidView';

describe('withFullView', () => {
  it('shows the full sheet while the callback runs', async () => {
    const el = document.createElement('div');
    el.setAttribute(AID_VIEW_ATTR, 'focus');
    let seen: string | null = null;
    await withFullView(el, async () => { seen = el.getAttribute(AID_VIEW_ATTR); });
    expect(seen).toBe('full');
  });

  it('restores the previous view afterwards', async () => {
    const el = document.createElement('div');
    el.setAttribute(AID_VIEW_ATTR, 'focus');
    await withFullView(el, async () => {});
    expect(el.getAttribute(AID_VIEW_ATTR)).toBe('focus');
  });

  it('restores even when the capture throws — a failed PDF must not strand the editor', async () => {
    const el = document.createElement('div');
    el.setAttribute(AID_VIEW_ATTR, 'focus');
    await expect(
      withFullView(el, async () => { throw new Error('html2canvas blew up'); }),
    ).rejects.toThrow('html2canvas blew up');
    expect(el.getAttribute(AID_VIEW_ATTR)).toBe('focus');
  });

  it('returns the callback result', async () => {
    const el = document.createElement('div');
    expect(await withFullView(el, async () => 42)).toBe(42);
  });

  it('still runs the callback when there is no element', async () => {
    const fn = vi.fn(async () => 'ok');
    expect(await withFullView(null, fn)).toBe('ok');
    expect(fn).toHaveBeenCalledOnce();
  });
});
