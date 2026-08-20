import { describe, it, expect } from 'vitest';
import { navToolsForShelf, FAVORITES_GROUP_ID } from '../myTools';

const favorites = (tools: string[]) => [{ id: FAVORITES_GROUP_ID, tools }];

describe('navToolsForShelf', () => {
  it('keeps every loose tool when nothing is favorited', () => {
    expect(navToolsForShelf(['music-library', 'attendance'], [])).toEqual(['music-library', 'attendance']);
    expect(navToolsForShelf(['music-library'], undefined)).toEqual(['music-library']);
  });

  it('drops the apps filed under Favorites', () => {
    // The report: favorites showing in the sidebar one by one, without the
    // heading that shelfGroupsForNav already removes.
    expect(navToolsForShelf(['music-library', 'attendance', 'studio'], favorites(['attendance'])))
      .toEqual(['music-library', 'studio']);
  });

  it('leaves the nav empty when everything is favorited', () => {
    expect(navToolsForShelf(['a-tool'], favorites(['a-tool']))).toEqual([]);
  });

  it('ignores other groups', () => {
    // Only Favorites is subtracted; a member's own groups render with their
    // headings and must not lose their loose copies.
    const groups = [{ id: 'my-group', tools: ['attendance'] }];
    expect(navToolsForShelf(['music-library', 'attendance'], groups))
      .toEqual(['music-library', 'attendance']);
  });

  it('matches across retired keys', () => {
    // 'merch' retired into 'shop' (MERGED_KEYS). A record can hold the old
    // key in one list and the new one in the other; a raw compare would miss
    // it and leave the app in the nav.
    expect(navToolsForShelf(['merch', 'studio'], favorites(['shop']))).not.toContain('shop');
    expect(navToolsForShelf(['merch', 'studio'], favorites(['shop']))).toContain('studio');
  });

  it('is a no-op for an empty Favorites group', () => {
    const tools = ['music-library', 'attendance'];
    expect(navToolsForShelf(tools, favorites([]))).toEqual(tools);
  });
});
