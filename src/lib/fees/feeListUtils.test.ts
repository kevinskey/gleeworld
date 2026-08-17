import { describe, it, expect } from 'vitest';
import { filterFees, buildFeesCsv, filterAssignableMembers } from './feeListUtils';
import type { StudentFee } from '@/hooks/useFeesManagement';

const fee = (over: Partial<StudentFee>): StudentFee =>
  ({
    id: 'f1',
    user_id: 'u1',
    amount: 50,
    paid_amount: 0,
    due_date: '2026-09-01',
    semester: 'Fall',
    academic_year: '2026',
    status: 'pending',
    category: 'participation',
    name: 'Band Fee',
    created_at: '',
    updated_at: '',
    user_profile: { full_name: 'Ada Lovelace', email: 'ada@example.com', role: 'member' },
    ...over,
  }) as StudentFee;

describe('filterFees', () => {
  const fees = [
    fee({ id: 'a', name: 'Band Fee', status: 'pending' }),
    fee({
      id: 'b',
      name: 'Trip Deposit',
      status: 'paid',
      user_profile: { full_name: 'Grace Hopper', email: 'g@example.com', role: 'member' },
    }),
    fee({ id: 'c', name: 'Fundraiser Goal', status: 'partial' }),
  ];

  it('matches on fee name, case-insensitive', () => {
    expect(filterFees(fees, { query: 'band', status: 'all' }).map(f => f.id)).toEqual(['a']);
  });

  it('matches on student name', () => {
    expect(filterFees(fees, { query: 'grace', status: 'all' }).map(f => f.id)).toEqual(['b']);
  });

  it('open filter keeps pending/partial/overdue only', () => {
    expect(filterFees(fees, { query: '', status: 'open' }).map(f => f.id)).toEqual(['a', 'c']);
  });

  it('paid filter keeps paid only', () => {
    expect(filterFees(fees, { query: '', status: 'paid' }).map(f => f.id)).toEqual(['b']);
  });
});

describe('buildFeesCsv', () => {
  it('emits header and quotes values containing commas', () => {
    const csv = buildFeesCsv([
      fee({
        amount: 100,
        paid_amount: 25,
        user_profile: { full_name: 'Lovelace, Ada', email: 'ada@example.com', role: 'member' },
      }),
    ]);
    const [header, row] = csv.split('\n');
    expect(header).toBe('Student,Email,Fee,Category,Amount,Paid,Remaining,Status,Due date');
    expect(row).toContain('"Lovelace, Ada"');
    expect(row).toContain('75.00');
  });

  it('doubles embedded quotes', () => {
    const csv = buildFeesCsv([fee({ name: 'The "Big" Trip' })]);
    expect(csv.split('\n')[1]).toContain('"The ""Big"" Trip"');
  });
});

describe('filterAssignableMembers', () => {
  const members = [
    { role: 'member' },
    { role: 'admin' },
    { role: 'director' },
    { role: null },
    { role: 'super_admin' },
    { role: 'super-admin' },
  ];

  it('studentsOnly excludes staff roles and keeps null role', () => {
    expect(filterAssignableMembers(members, true)).toEqual([{ role: 'member' }, { role: null }]);
  });

  it('passes everyone through when off', () => {
    expect(filterAssignableMembers(members, false)).toHaveLength(6);
  });
});
