import { describe, it, expect } from 'vitest';
import { getTabItems, getAppTiles, type ModuleFlags } from '../appDestinations';

const allOn: ModuleFlags = {
  hasViewer: true, hasPartTracks: true, hasStudio: true, hasSightReading: true,
  hasBoxOffice: true, hasConcertPlanner: true, hasMerch: true, hasFinance: true, hasAcademy: true,
};

describe('getTabItems', () => {
  it('student gets Home/Messages/Music/Studio/Schedule', () => {
    expect(getTabItems('student', allOn).map((t) => t.label))
      .toEqual(['Home', 'Messages', 'Music', 'Studio', 'Schedule']);
  });
  it('faculty gets Roster instead of Studio', () => {
    expect(getTabItems('faculty', allOn).map((t) => t.label))
      .toEqual(['Home', 'Messages', 'Roster', 'Music', 'Schedule']);
  });
  it('student without Studio module gets Schedule slot filled, never a dead tab', () => {
    const tabs = getTabItems('student', { ...allOn, hasStudio: false });
    expect(tabs).toHaveLength(5);
    expect(tabs.map((t) => t.label)).not.toContain('Studio');
  });
  it('student without Viewer or Studio never resolves two slots to the same destination', () => {
    const tabs = getTabItems('student', { ...allOn, hasViewer: false, hasStudio: false });
    expect(tabs).toHaveLength(5);
    expect(new Set(tabs.map((t) => t.key)).size).toBe(5);
    expect(new Set(tabs.map((t) => t.to)).size).toBe(5);
  });
});

describe('getAppTiles', () => {
  it('never returns more than 8 primary tiles', () => {
    const { primary } = getAppTiles('faculty', allOn);
    expect(primary.length).toBeLessThanOrEqual(8);
  });
  it('gates module tiles off when flag is false', () => {
    const { primary, overflow } = getAppTiles('student', { ...allOn, hasBoxOffice: false });
    const labels = [...primary, ...overflow].map((t) => t.label);
    expect(labels).not.toContain('Tickets');
  });
  it('never repeats a tab destination in the grid, even when keys differ but routes match', () => {
    const tabRoutes = new Set(getTabItems('faculty', allOn).map((t) => t.to));
    const { primary, overflow } = getAppTiles('faculty', allOn);
    const gridRoutes = [...primary, ...overflow].map((t) => t.to);
    for (const route of gridRoutes) {
      expect(tabRoutes.has(route)).toBe(false);
    }
  });
});
