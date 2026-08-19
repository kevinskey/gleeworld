// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { sectionKeyFromPath, isFabCollapsed, setFabCollapsed } from './fabPrefs';

describe('sectionKeyFromPath', () => {
  it('maps bare /dashboard to home', () => {
    expect(sectionKeyFromPath('/dashboard')).toBe('home');
    expect(sectionKeyFromPath('/dashboard/')).toBe('home');
  });
  it('uses the second segment for dashboard pages', () => {
    expect(sectionKeyFromPath('/dashboard/calendar')).toBe('calendar');
    expect(sectionKeyFromPath('/dashboard/viewer/abc123')).toBe('viewer');
  });
  it('uses the first segment elsewhere', () => {
    expect(sectionKeyFromPath('/studio/sessions/xyz')).toBe('studio');
    expect(sectionKeyFromPath('/tour-manager')).toBe('tour-manager');
  });
  it('falls back to home for the root path', () => {
    expect(sectionKeyFromPath('/')).toBe('home');
  });
});

describe('collapse prefs', () => {
  beforeEach(() => localStorage.clear());

  // The FAB starts tucked so it never sits on a page's Save button. Anything
  // not explicitly pulled out is collapsed.
  it('defaults to collapsed', () => {
    expect(isFabCollapsed('studio')).toBe(true);
    expect(isFabCollapsed('calendar')).toBe(true);
  });

  it('round-trips per section', () => {
    setFabCollapsed('studio', false);
    expect(isFabCollapsed('studio')).toBe(false);
    // Pulling it out in one section must not pull it out everywhere.
    expect(isFabCollapsed('calendar')).toBe(true);
    setFabCollapsed('studio', true);
    expect(isFabCollapsed('studio')).toBe(true);
  });

  // The regression this guards: recording "open" by DELETING the key would
  // read back as the default — collapsed — so the pill would tuck itself
  // away again on the next visit to a section the user had opened.
  it('remembers being pulled out across reloads', () => {
    setFabCollapsed('viewer', false);
    const stored = JSON.parse(localStorage.getItem('gw_assistant_fab_collapsed') ?? '{}');
    expect(stored).toHaveProperty('viewer', false);
    expect(isFabCollapsed('viewer')).toBe(false);
  });

  it('survives corrupt storage', () => {
    localStorage.setItem('gw_assistant_fab_collapsed', '{nope');
    expect(isFabCollapsed('studio')).toBe(true);
    setFabCollapsed('studio', false);
    expect(isFabCollapsed('studio')).toBe(false);
  });
});
