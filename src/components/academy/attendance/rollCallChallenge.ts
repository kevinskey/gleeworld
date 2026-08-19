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

export function parseSchedule(raw: unknown): RollCallSchedule | null {
  const r = raw as { success?: unknown; first_slot?: unknown; slots?: unknown; interval_seconds?: unknown; server_now?: unknown; closes_at?: unknown } | null;
  if (!r || r.success !== true) return null;
  if (typeof r.first_slot !== 'number' || !Array.isArray(r.slots)) return null;
  if (!r.slots.every((s: unknown) => typeof s === 'number')) return null;
  return {
    firstSlot: r.first_slot,
    slots: r.slots,
    intervalSeconds: typeof r.interval_seconds === 'number' ? r.interval_seconds : ROTATION_SECONDS,
    serverNow: String(r.server_now ?? ''),
    closesAt: String(r.closes_at ?? ''),
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
