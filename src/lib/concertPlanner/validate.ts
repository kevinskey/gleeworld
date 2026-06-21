// Validation engine for the Concert Planner.
//
// Three levels:
//   - required → blocks publish. Missing core logistics, missing
//     composer attribution, empty roster sections.
//   - warning  → allowed to publish but worth surfacing. Length overrun,
//     unknown rights status, possible traditional work without an
//     arranger credit.
//   - ready    → green check, used so the sidebar doesn't look hostile
//     for a clean program.
//
// Pure function — no Supabase access, no React. Called from useMemo in
// the editor and on the server before publish.

import type {
  ConcertProgram,
  ConcertPiece,
  RosterSection,
  ValidationItem,
} from './types';

export interface ValidateResult {
  items: ValidationItem[];
  hasRequiredFixes: boolean;
  hasWarnings: boolean;
}

export function validateProgram(
  program: ConcertProgram | null,
  pieces: ConcertPiece[],
  roster: RosterSection[],
): ValidateResult {
  const items: ValidationItem[] = [];

  if (!program) {
    return { items, hasRequiredFixes: true, hasWarnings: false };
  }

  // ── Logistics ────────────────────────────────────────────────────
  if (program.venue && program.event_date) {
    items.push({
      id: 'meta-core-ok',
      category: 'metadata',
      level: 'ready',
      message: `Logistics set: ${program.venue} on ${program.event_date}.`,
    });
  } else {
    items.push({
      id: 'meta-core',
      category: 'metadata',
      level: 'required',
      message: 'Missing core logistics — venue and event date are both required to publish.',
    });
  }

  if (program.conductor && program.accompanist) {
    items.push({
      id: 'meta-staff-ok',
      category: 'metadata',
      level: 'ready',
      message: `Artistic team credited: ${program.conductor} conducting, ${program.accompanist} at the keyboard.`,
    });
  } else if (!program.conductor) {
    items.push({
      id: 'meta-conductor',
      category: 'metadata',
      level: 'warning',
      message: 'No conductor credited on the program.',
    });
  } else if (!program.accompanist) {
    items.push({
      id: 'meta-accompanist',
      category: 'metadata',
      level: 'warning',
      message: 'No accompanist credited on the program.',
    });
  }

  // ── Timing ───────────────────────────────────────────────────────
  if (pieces.length > 0 && program.target_length_minutes) {
    const totalSec = pieces.reduce((acc, p) => acc + (p.duration_seconds ?? 0), 0);
    const totalMin = Math.ceil(totalSec / 60);
    if (totalSec === 0) {
      items.push({
        id: 'timing-no-durations',
        category: 'timing',
        level: 'warning',
        message: 'None of the pieces have a duration set, so the runtime estimate is unavailable.',
      });
    } else if (totalMin <= program.target_length_minutes) {
      items.push({
        id: 'timing-ok',
        category: 'timing',
        level: 'ready',
        message: `Estimated runtime ${totalMin}m fits the ${program.target_length_minutes}m target.`,
      });
    } else {
      items.push({
        id: 'timing-overrun',
        category: 'timing',
        level: 'warning',
        message: `Estimated runtime ${totalMin}m exceeds the ${program.target_length_minutes}m target.`,
      });
    }
  }

  // ── Repertoire + rights ──────────────────────────────────────────
  if (pieces.length === 0) {
    items.push({
      id: 'rep-empty',
      category: 'repertoire',
      level: 'required',
      message: 'Program has no pieces yet — add at least one before publishing.',
    });
  } else {
    pieces.forEach((piece) => {
      if (!piece.composer) {
        items.push({
          id: `rep-composer-${piece.id}`,
          category: 'repertoire',
          level: 'required',
          message: `"${piece.title || 'Untitled work'}" needs a composer attribution.`,
        });
      }

      // If the title or notes suggest the piece is traditional but no
      // arranger is credited, nudge — without forcing.
      const looksTraditional = /\b(traditional|spiritual|folk|public\s*domain)\b/i
        .test(`${piece.title ?? ''} ${piece.program_notes ?? ''}`);
      if (looksTraditional && !piece.arranger) {
        items.push({
          id: `rep-arranger-${piece.id}`,
          category: 'repertoire',
          level: 'warning',
          message: `"${piece.title}" looks like a traditional piece — consider crediting an arranger.`,
        });
      }

      // Rights are the hard rule. Unknown is not OK to publish.
      const status = piece.rights_status ?? 'unknown';
      if (status === 'unknown') {
        items.push({
          id: `rights-${piece.id}`,
          category: 'rights',
          level: 'required',
          message: `Rights status for "${piece.title}" is unknown. Mark it Public Domain or Licensed (with copyright info) before publishing.`,
        });
      } else if (status === 'licensed' && !piece.copyright_info) {
        items.push({
          id: `rights-info-${piece.id}`,
          category: 'rights',
          level: 'warning',
          message: `"${piece.title}" is marked Licensed but has no copyright info filled in.`,
        });
      }
    });
  }

  // ── Roster ───────────────────────────────────────────────────────
  const empties = roster.filter((s) => s.members.length === 0);
  if (roster.length === 0) {
    items.push({
      id: 'roster-empty-list',
      category: 'roster',
      level: 'warning',
      message: 'No roster sections defined. Add voice parts so the ensemble appears on the program.',
    });
  } else if (empties.length === 0) {
    items.push({
      id: 'roster-ok',
      category: 'roster',
      level: 'ready',
      message: `All ${roster.length} roster section${roster.length === 1 ? '' : 's'} have members.`,
    });
  } else {
    items.push({
      id: 'roster-empties',
      category: 'roster',
      level: 'required',
      message: `These roster section${empties.length === 1 ? ' is' : 's are'} empty: ${empties.map((s) => s.section_name).join(', ')}.`,
    });
  }

  return {
    items,
    hasRequiredFixes: items.some((i) => i.level === 'required'),
    hasWarnings: items.some((i) => i.level === 'warning'),
  };
}
