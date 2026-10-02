import { describe, expect, it } from 'vitest';
import {
  isMemberRole,
  normalizeMemberRole,
  MEMBER_ROLE,
  MEMBER_ROLE_VALUES,
} from '../memberRole';

describe('isMemberRole', () => {
  it('accepts the stored spelling', () => {
    expect(isMemberRole('member')).toBe(true);
  });

  it('no longer accepts the legacy spelling — phase 3 retired it', () => {
    // Phase 2 migrated every row off 'student'; a value still spelled that
    // way is now a course role or a bug, not this audience.
    expect(isMemberRole('student')).toBe(false);
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
    expect(isMemberRole('Member')).toBe(false);
    expect(isMemberRole(' member')).toBe(false);
  });
});

describe('normalizeMemberRole', () => {
  it('passes the canonical spelling through', () => {
    expect(normalizeMemberRole('member')).toBe(MEMBER_ROLE);
  });

  it('leaves other roles alone', () => {
    expect(normalizeMemberRole('admin')).toBe('admin');
    expect(normalizeMemberRole('student')).toBe('student');
    expect(normalizeMemberRole(null)).toBeNull();
  });
});

describe('MEMBER_ROLE_VALUES', () => {
  it('carries only the stored spelling', () => {
    expect([...MEMBER_ROLE_VALUES]).toEqual(['member']);
  });
});
