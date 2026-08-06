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
}

export interface StipendStanding {
  baseAmount: number;
  requiredServices: number;
  perServiceValue: number;
  creditedServices: number;
  absences: number;
  unmappedCount: number;
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
 * count of calendar events, so it is never derived here.
 */
export function calculateStanding(input: StipendInput): StipendStanding {
  const { baseAmount, requiredServices, marks, weights } = input;
  const rounding = input.rounding ?? 'cent';

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

  // Guard the misconfiguration rather than dividing by zero. The table also
  // carries CHECK (required_services > 0), so this should be unreachable.
  if (!(requiredServices > 0) || !(baseAmount >= 0)) {
    return {
      baseAmount,
      requiredServices,
      perServiceValue: 0,
      creditedServices,
      absences,
      unmappedCount,
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
    unmappedCount,
    earned,
    forfeited: roundMoney(baseAmount - earned, rounding),
  };
}
