import { Rounding, StatusWeights, weightFor } from './policy';

export interface AttendanceMark {
  eventId: string;
  status: string;
}

export interface StipendInput {
  baseAmount: number;
  requiredServices: number;
  marks: AttendanceMark[];
  weights: StatusWeights;
  rounding?: Rounding;
  /**
   * Countable units where roll was taken but this student has no row. They
   * score zero, exactly as an absence does, but they are counted apart from
   * `absences` because they usually mean a failed scan rather than a decision.
   */
  unmarkedUnits?: number;
  /**
   * Units matching the period where roll was never taken at all. These score
   * for nobody and are NOT part of `creditedServices`, so a period carrying
   * them cannot reach a full stipend however well a student attends. Reported
   * so a caller can say so rather than presenting a quiet shortfall as if the
   * student had earned it.
   */
  uncoveredUnits?: number;
}

export interface StipendStanding {
  baseAmount: number;
  requiredServices: number;
  perServiceValue: number;
  creditedServices: number;
  absences: number;
  unmarkedCount: number;
  unmappedCount: number;
  uncoveredUnits: number;
  /** Units that could still be earned: required minus what the calendar covers. */
  shortfallUnits: number;
  earned: number;
  forfeited: number;
}

function roundMoney(value: number, rounding: Rounding): number {
  if (rounding === 'dollar') return Math.round(value);
  return Math.round(value * 100) / 100;
}

/**
 * Pro-rata stipend math. One service is worth `baseAmount / requiredServices`;
 * a student earns the share of the stipend matching their credited services,
 * clamped to [0, baseAmount].
 *
 * `requiredServices` is the number an admin agreed with the student, not a
 * count of calendar events, so it is never derived here. The consequence is
 * that a period whose calendar covers fewer services than `requiredServices`
 * cannot pay a full stipend to anyone — see `uncoveredUnits`/`shortfallUnits`,
 * which exist so a caller can report that rather than let it pass as a
 * student's own shortfall.
 *
 * NOTE ON AUTHORITY. The number actually paid comes from the SQL view
 * `v_stipend_standing`, which is what the UI reads and what
 * `close_stipend_period()` freezes into `final_amount`. This function is the
 * reference implementation of the same rules, kept because the rules are
 * easier to pin down in unit tests than in a view. The two must agree; if they
 * ever disagree, the view wins and this is the bug.
 */
export function calculateStanding(input: StipendInput): StipendStanding {
  const { baseAmount, requiredServices, marks, weights } = input;
  const rounding = input.rounding ?? 'cent';
  const unmarkedCount = input.unmarkedUnits ?? 0;
  const uncoveredUnits = input.uncoveredUnits ?? 0;

  let creditedServices = 0;
  let absences = 0;
  let unmappedCount = 0;

  for (const mark of marks) {
    const weight = weightFor(mark.status, weights);
    if (weight === null) {
      unmappedCount += 1;
      continue;
    }
    creditedServices += weight;
    if (weight === 0) absences += 1;
  }

  // An unmarked unit scores zero, matching the view's
  // `WHEN attendance_status IS NULL THEN 0`. It adds nothing to
  // creditedServices; it is carried only so the caller can report it.

  // How far the covered calendar falls short of a full stipend. Uncovered
  // units are not in `marks` at all, so this is the only place they surface.
  const coveredUnits = marks.length + unmarkedCount;
  const shortfallUnits = Math.max(requiredServices - coveredUnits, 0);

  // Guard the misconfiguration rather than dividing by zero. The table also
  // carries CHECK (required_services > 0), so this should be unreachable.
  if (!(requiredServices > 0) || !(baseAmount >= 0)) {
    return {
      baseAmount,
      requiredServices,
      perServiceValue: 0,
      creditedServices,
      absences,
      unmarkedCount,
      unmappedCount,
      uncoveredUnits,
      shortfallUnits,
      earned: 0,
      forfeited: 0,
    };
  }

  const perServiceValue = roundMoney(baseAmount / requiredServices, rounding);
  const raw = (baseAmount * creditedServices) / requiredServices;
  const earned = roundMoney(Math.min(Math.max(raw, 0), baseAmount), rounding);

  return {
    baseAmount,
    requiredServices,
    perServiceValue,
    creditedServices,
    absences,
    unmarkedCount,
    unmappedCount,
    uncoveredUnits,
    shortfallUnits,
    earned,
    forfeited: roundMoney(baseAmount - earned, rounding),
  };
}
