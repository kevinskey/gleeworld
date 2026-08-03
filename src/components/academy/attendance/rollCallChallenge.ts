// Shared roll-call challenge math. The SERVER is the only validation authority
// (roll_call_check_in RPC); this mirror exists solely so the instructor display
// can rotate locally from a prefetched schedule and survive network blips.
export const ROLL_CALL_SYMBOLS = ['🔺', '🟦', '⭐', '🌙', '⚡', '❤️', '🔔', '☂️'] as const;
export const ROTATION_SECONDS = 30;

export interface RollCallSchedule {
  firstSlot: number;
  slots: number[];
  intervalSeconds: number;
  serverNow: string;
  closesAt: string;
}

export function slotForTime(epochMs: number): number {
  return Math.floor(epochMs / 1000 / ROTATION_SECONDS);
}

export function clockOffsetMs(serverNowIso: string, clientNowMs: number): number {
  return new Date(serverNowIso).getTime() - clientNowMs;
}

export function parseSchedule(raw: any): RollCallSchedule | null {
  if (!raw || raw.success !== true) return null;
  if (typeof raw.first_slot !== 'number' || !Array.isArray(raw.slots)) return null;
  if (!raw.slots.every((s: unknown) => typeof s === 'number')) return null;
  return {
    firstSlot: raw.first_slot,
    slots: raw.slots,
    intervalSeconds: typeof raw.interval_seconds === 'number' ? raw.interval_seconds : ROTATION_SECONDS,
    serverNow: String(raw.server_now ?? ''),
    closesAt: String(raw.closes_at ?? ''),
  };
}

export function symbolIndexAt(schedule: RollCallSchedule, correctedNowMs: number): number | null {
  const idx = slotForTime(correctedNowMs) - schedule.firstSlot;
  return idx >= 0 && idx < schedule.slots.length ? schedule.slots[idx] : null;
}

export function secondsRemainingInSlot(correctedNowMs: number): number {
  const intoSlot = Math.floor((correctedNowMs / 1000) % ROTATION_SECONDS);
  return ROTATION_SECONDS - intoSlot;
}

export type RollCallCardStatus = 'ready' | 'present' | 'late' | 'locked';

export function deriveCardStatus(state: {
  checked_in: boolean;
  status?: string | null;
  locked: boolean;
}): RollCallCardStatus {
  if (state.checked_in) return state.status === 'late' ? 'late' : 'present';
  if (state.locked) return 'locked';
  return 'ready';
}
