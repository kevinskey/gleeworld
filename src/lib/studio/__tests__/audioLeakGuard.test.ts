// The leak-guard registry: every studio audio owner registers a disposer,
// the route-level kill switch disposes whatever is still registered, and
// the happy path (owner cleaned itself up) leaves nothing to do.
import { describe, it, expect } from 'vitest';
import {
  registerStudioAudio, disposeAllStudioAudio, liveStudioAudioCount,
} from '../audioLeakGuard';

describe('audioLeakGuard', () => {
  it('disposes leaked resources and empties the registry', () => {
    let disposed = 0;
    registerStudioAudio({ dispose: () => { disposed++; } });
    registerStudioAudio({ dispose: () => { disposed++; } });
    expect(liveStudioAudioCount()).toBe(2);
    disposeAllStudioAudio();
    expect(disposed).toBe(2);
    expect(liveStudioAudioCount()).toBe(0);
  });

  it('unregistered (happy-path) resources are not disposed by the kill switch', () => {
    let disposed = 0;
    const unregister = registerStudioAudio({ dispose: () => { disposed++; } });
    unregister();
    disposeAllStudioAudio();
    expect(disposed).toBe(0);
  });

  it('a throwing disposer does not stop the sweep', () => {
    let disposed = 0;
    registerStudioAudio({ dispose: () => { throw new Error('already torn down'); } });
    registerStudioAudio({ dispose: () => { disposed++; } });
    disposeAllStudioAudio();
    expect(disposed).toBe(1);
    expect(liveStudioAudioCount()).toBe(0);
  });

  it('is idempotent — a second sweep over an empty registry is a no-op', () => {
    disposeAllStudioAudio();
    expect(liveStudioAudioCount()).toBe(0);
  });
});
