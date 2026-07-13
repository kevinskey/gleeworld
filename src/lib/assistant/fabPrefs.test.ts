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
  it('round-trips per section', () => {
    expect(isFabCollapsed('studio')).toBe(false);
    setFabCollapsed('studio', true);
    expect(isFabCollapsed('studio')).toBe(true);
    expect(isFabCollapsed('calendar')).toBe(false);
    setFabCollapsed('studio', false);
    expect(isFabCollapsed('studio')).toBe(false);
  });
  it('survives corrupt storage', () => {
    localStorage.setItem('gw_assistant_fab_collapsed', '{nope');
    expect(isFabCollapsed('studio')).toBe(false);
    setFabCollapsed('studio', true);
    expect(isFabCollapsed('studio')).toBe(true);
  });
});
