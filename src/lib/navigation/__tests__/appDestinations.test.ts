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
});
