import type { StudentFee } from '@/hooks/useFeesManagement';

export type FeeStatusFilter = 'all' | 'open' | 'paid';

const OPEN_STATUSES = new Set(['pending', 'partial', 'overdue']);

export function filterFees(
  fees: StudentFee[],
  opts: { query: string; status: FeeStatusFilter },
): StudentFee[] {
  const q = opts.query.trim().toLowerCase();
  return fees.filter(f => {
    if (opts.status === 'open' && !OPEN_STATUSES.has(f.status)) return false;
    if (opts.status === 'paid' && f.status !== 'paid') return false;
    if (!q) return true;
    const student = (f.user_profile?.full_name ?? '').toLowerCase();
    return f.name.toLowerCase().includes(q) || student.includes(q);
  });
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildFeesCsv(fees: StudentFee[]): string {
  const header = 'Student,Email,Fee,Category,Amount,Paid,Remaining,Status,Due date';
  const rows = fees.map(f => {
    const paid = Number(f.paid_amount ?? 0);
    const amount = Number(f.amount);
    return [
      f.user_profile?.full_name ?? '',
      f.user_profile?.email ?? '',
      f.name,
      f.category,
      amount.toFixed(2),
      paid.toFixed(2),
      (amount - paid).toFixed(2),
      f.status,
      f.due_date ?? '',
    ]
      .map(csvCell)
      .join(',');
  });
  return [header, ...rows].join('\n');
}

// Staff roles hidden by the assign dialog's "Students only" toggle. A null
// role is a plain member profile, so it stays visible.
const STAFF_ROLES = new Set(['admin', 'super_admin', 'super-admin', 'director', 'owner', 'treasurer']);

export function filterAssignableMembers<T extends { role: string | null }>(
  members: T[],
  studentsOnly: boolean,
): T[] {
  if (!studentsOnly) return members;
  return members.filter(m => !m.role || !STAFF_ROLES.has(m.role));
}
