import { describe, it, expect } from 'vitest';
import { blockPage, sitePages } from '../types';
import { BLOCK_REGISTRY } from '../registry';

describe('site pages', () => {
  // Legacy published snapshots have no `page` key on blocks — they must all
  // read as the home page or every existing tenant site goes blank.
  it('blocks without a page are home blocks', () => {
    expect(blockPage({})).toBe('home');
    expect(blockPage({ page: undefined })).toBe('home');
    expect(blockPage({ page: '' })).toBe('home');
    expect(blockPage({ page: 'retirement' })).toBe('retirement');
  });

  it('sitePages lists home first, extras sorted, no duplicates', () => {
    expect(sitePages([])).toEqual(['home']);
    expect(sitePages([{ page: 'retirement' }, {}, { page: 'retirement' }, { page: 'about' }]))
      .toEqual(['home', 'about', 'retirement']);
  });
});

describe('new blocks are registered', () => {
  it.each(['wishes-wall', 'audition-signup'])('%s is in the registry', (type) => {
    const mod = BLOCK_REGISTRY[type];
    expect(mod).toBeTruthy();
    expect(mod.defaultConfig).toBeTruthy();
    expect(mod.configSchema.safeParse(mod.defaultConfig).success).toBe(true);
  });
});
