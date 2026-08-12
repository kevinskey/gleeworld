// Regression guard for the branch's one Critical finding: opening the home
// keycap grid's editor and tapping Done WITHOUT touching anything used to
// permanently shorten the member's stored My Tools record.
//
// The mechanism, end to end:
//   HomeTileGrid seeds its edit draft from getAppTiles' `primary`
//   → `primary` is a LOSSY view of the stored record (a key whose route the
//     phone tab bar already carries has no keycap, and neither did a
//     sidebar-only entry back when the pool was filtered to grid surfaces)
//   → Done wrote that draft straight back through saveTools
//   → every unrepresented key was deleted, on every device, permanently.
//
// `calendar` and `messages` are the first TWO entries of both role defaults,
// so this hit every member who had never customized anything. This file
// exercises the real pipeline (getAppTiles → draft → mergeGridOrder →
// sanitizeTools) rather than asserting on the merge helper alone, because the
// bug lived in the seam.
//
// SCOPE, since groups landed: this file pins the GROUPLESS projection only.
// The real path for a member who has made groups is
// mergeGridOrder → re-split by membership → saveShelf → sanitizeShelf, and
// the grouped half of that seam is covered by HouseHome.test.tsx's "a grid
// edit never flattens the member's groups" block. Both halves matter — this
// one guards the keys the grid cannot represent, that one guards the filing.
import { describe, it, expect } from 'vitest';
import { getAppTiles, getTabItems, type ModuleFlags } from '../appDestinations';
import {
  mergeGridOrder, sanitizeTools, DEFAULT_TOOLS_FACULTY, DEFAULT_TOOLS_STUDENT,
} from '../myTools';
import type { NavContext } from '../navCatalog';

const allOn: ModuleFlags = {
  hasViewer: true, hasStudio: true, hasSightReading: true, hasBoxOffice: true,
  hasConcertPlanner: true, hasMerch: true, hasFinance: true, hasAcademy: true,
  hasStore: true, hasSongwriting: true, hasPlanner: true,
};

const navFor = (isTenantAdmin: boolean): NavContext => ({
  hasModule: () => true,
  isTenantAdmin,
  isPlatformAdmin: false,
  canLibrarian: isTenantAdmin,
  isPartner: false,
  hiddenRoutes: new Set(),
});

/**
 * One full "Edit apps → Done" round trip with ZERO edits, returning what
 * would be persisted. Mirrors HouseHome: the draft starts as the rendered
 * primary keys, `representable` is everything the grid could show, and the
 * merged result goes through the same sanitizeTools the save path applies.
 */
function editDoneUnchanged(
  role: 'student' | 'faculty',
  stored: string[],
  tabBarVisible: boolean,
): { saved: string[]; naive: string[]; representable: Set<string> } {
  const nav = navFor(role === 'faculty');
  const { primary, overflow } = getAppTiles(role, allOn, nav, stored, { tabBarVisible });
  const draft = primary.map((t) => t.key); // the editor opens, nothing is touched
  const representable = new Set([...primary, ...overflow].map((t) => t.key));
  return {
    saved: sanitizeTools(mergeGridOrder(stored, draft, representable)),
    naive: sanitizeTools(draft), // what the shipped code wrote: the draft alone
    representable,
  };
}

describe('home grid → My Tools round trip', () => {
  describe('on a phone-sized viewport (tab bar visible)', () => {
    it('faculty default: Edit → Done with no changes is a byte-identical no-op', () => {
      const { saved } = editDoneUnchanged('faculty', DEFAULT_TOOLS_FACULTY, true);
      expect(saved).toEqual(DEFAULT_TOOLS_FACULTY);
    });

    it('student default: Edit → Done with no changes is a byte-identical no-op', () => {
      const { saved } = editDoneUnchanged('student', DEFAULT_TOOLS_STUDENT, true);
      expect(saved).toEqual(DEFAULT_TOOLS_STUDENT);
    });

    it('the fixture is genuinely lossy: the tab bar really does claim stored keys', () => {
      // Without this, the two assertions above could pass vacuously on a
      // future change that made every stored key representable. Pin the
      // actual gap: Calendar/Messages (and, for a student, Studio) are on
      // the tab bar, so they have no keycap and the draft cannot speak for
      // them — which is exactly why the merge exists.
      const faculty = editDoneUnchanged('faculty', DEFAULT_TOOLS_FACULTY, true);
      expect(faculty.representable.has('calendar')).toBe(false);
      expect(faculty.representable.has('messages')).toBe(false);
      expect(faculty.naive).not.toEqual(DEFAULT_TOOLS_FACULTY);
      expect(faculty.naive).not.toContain('calendar');
      expect(faculty.naive).not.toContain('messages');

      const student = editDoneUnchanged('student', DEFAULT_TOOLS_STUDENT, true);
      const studentTabRoutes = new Set(getTabItems('student', allOn).map((t) => t.to));
      expect(studentTabRoutes.has('/studio')).toBe(true);
      expect(student.representable.has('studio')).toBe(false);
      expect(student.naive).not.toEqual(DEFAULT_TOOLS_STUDENT);
    });
  });

  describe('above the tab bar breakpoint (no tab bar)', () => {
    it('renders the WHOLE stored set as keycaps — same set as the sidebar shelf', () => {
      for (const [role, stored] of [
        ['faculty', DEFAULT_TOOLS_FACULTY],
        ['student', DEFAULT_TOOLS_STUDENT],
      ] as const) {
        const { primary } = getAppTiles(role, allOn, navFor(role === 'faculty'), stored, {
          tabBarVisible: false,
        });
        // Including calendar + messages, which are surfaces: ['sidebar'] —
        // the grid-surface filter that hid them is not applied to a My
        // Tools set (Kevin's ruling: keycaps show the same set as the shelf).
        expect(primary.map((t) => t.key)).toEqual(stored);
      }
    });

    it('Edit → Done with no changes is still a byte-identical no-op', () => {
      expect(editDoneUnchanged('faculty', DEFAULT_TOOLS_FACULTY, false).saved)
        .toEqual(DEFAULT_TOOLS_FACULTY);
      expect(editDoneUnchanged('student', DEFAULT_TOOLS_STUDENT, false).saved)
        .toEqual(DEFAULT_TOOLS_STUDENT);
    });
  });

  describe('real edits still land, without collateral loss', () => {
    const stored = DEFAULT_TOOLS_FACULTY;

    function save(draft: string[]): string[] {
      const nav = navFor(true);
      const { primary, overflow } = getAppTiles('faculty', allOn, nav, stored, { tabBarVisible: true });
      const representable = new Set([...primary, ...overflow].map((t) => t.key));
      return sanitizeTools(mergeGridOrder(stored, draft, representable));
    }

    it('removing a keycap removes exactly that key', () => {
      const saved = save(['music-library', 'academy', 'planner', 'people', 'part-tracks']); // finance dropped
      expect(saved).toEqual(['calendar', 'messages', 'music-library', 'academy', 'planner', 'people', 'part-tracks']);
    });

    it('reordering keycaps reorders only the keycap slots', () => {
      const saved = save(['finance', 'music-library', 'academy', 'planner', 'people', 'part-tracks']);
      expect(saved).toEqual(['calendar', 'messages', 'finance', 'music-library', 'academy', 'planner', 'people', 'part-tracks']);
    });

    it('a stored tool the grid could not show keeps its position, not just its presence', () => {
      // calendar and messages were stored FIRST; they must come back first.
      const saved = save(['people', 'finance']);
      expect(saved.slice(0, 2)).toEqual(['calendar', 'messages']);
    });
  });
});
