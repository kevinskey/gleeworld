import { describe, expect, it } from 'vitest';
import {
  isMemberRole,
  normalizeMemberRole,
  LEGACY_MEMBER_ROLE,
  MEMBER_ROLE,
  MEMBER_ROLE_VALUES,
} from '../memberRole';

describe('isMemberRole', () => {
  it('accepts both spellings — the whole point of the dual-accept phase', () => {
    expect(isMemberRole('student')).toBe(true);
    expect(isMemberRole('member')).toBe(true);
  });

  it('rejects every other role', () => {
    for (const r of ['admin', 'super-admin', 'super_admin', 'fan', 'staff', 'alumna', 'parent']) {
      expect(isMemberRole(r)).toBe(false);
    }
  });

  it('is safe on null/undefined rather than throwing', () => {
    expect(isMemberRole(null)).toBe(false);
    expect(isMemberRole(undefined)).toBe(false);
    expect(isMemberRole('')).toBe(false);
  });

  it('does not match on case or whitespace — stored roles are exact', () => {
    expect(isMemberRole('Student')).toBe(false);
    expect(isMemberRole(' student')).toBe(false);
  });
});

describe('normalizeMemberRole', () => {
  it('collapses both spellings to one bucket', () => {
    expect(normalizeMemberRole('student')).toBe(MEMBER_ROLE);
    expect(normalizeMemberRole('member')).toBe(MEMBER_ROLE);
  });

  it('leaves other roles alone', () => {
    expect(normalizeMemberRole('admin')).toBe('admin');
    expect(normalizeMemberRole('fan')).toBe('fan');
    expect(normalizeMemberRole(null)).toBeNull();
  });
});

describe('MEMBER_ROLE_VALUES', () => {
  it('carries both spellings for .in() filters', () => {
    expect([...MEMBER_ROLE_VALUES].sort()).toEqual(['member', 'student']);
  });

  it('includes the legacy spelling, which is still what is stored', () => {
    expect(MEMBER_ROLE_VALUES).toContain(LEGACY_MEMBER_ROLE);
  });
});
