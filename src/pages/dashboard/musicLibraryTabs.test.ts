import { describe, it, expect } from 'vitest';
import { MUSIC_LIBRARY_TABS } from './musicLibraryTabs';

describe('MUSIC_LIBRARY_TABS', () => {
  it('places the GW Sheet Music Store tab immediately before Public Domain', () => {
    expect(MUSIC_LIBRARY_TABS.map((t) => t.key)).toEqual(
      ['scores', 'my-music', 'setlists', 'store', 'public-domain']
    );
    const store = MUSIC_LIBRARY_TABS.find((t) => t.key === 'store');
    expect(store?.label).toBe('GW Sheet Music Store');
  });
});
