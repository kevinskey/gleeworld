// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { retainUnsavedWork, hasUnsavedWork, __resetUnsavedWorkForTests } from './unsavedWork';

afterEach(() => __resetUnsavedWorkForTests());

describe('unsavedWork registry', () => {
  it('is clean by default', () => {
    expect(hasUnsavedWork()).toBe(false);
  });

  it('reports unsaved while retained and clean after release', () => {
    const release = retainUnsavedWork('studio-session');
    expect(hasUnsavedWork()).toBe(true);
    release();
    expect(hasUnsavedWork()).toBe(false);
  });

  it('stays unsaved until every holder releases', () => {
    const a = retainUnsavedWork('recording');
    const b = retainUnsavedWork('editor');
    a();
    expect(hasUnsavedWork()).toBe(true);
    b();
    expect(hasUnsavedWork()).toBe(false);
  });

  it('releasing twice does not underflow another holder', () => {
    const a = retainUnsavedWork('one');
    const b = retainUnsavedWork('two');
    a();
    a(); // double release must be a no-op
    expect(hasUnsavedWork()).toBe(true);
    b();
    expect(hasUnsavedWork()).toBe(false);
  });

  it('arms beforeunload while retained (leave-confirmation) and disarms after', () => {
    const release = retainUnsavedWork('studio-session');
    const armed = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(armed);
    expect(armed.defaultPrevented).toBe(true);

    release();
    const disarmed = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(disarmed);
    expect(disarmed.defaultPrevented).toBe(false);
  });
});
