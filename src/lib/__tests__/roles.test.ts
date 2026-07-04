import { describe, it, expect } from 'vitest';
import { isFacultyProfile } from '../roles';

describe('isFacultyProfile', () => {
  it('true for admin flags and faculty roles, case-insensitive', () => {
    expect(isFacultyProfile({ is_admin: true })).toBe(true);
    expect(isFacultyProfile({ is_super_admin: true })).toBe(true);
    expect(isFacultyProfile({ role: 'Instructor' })).toBe(true);
    expect(isFacultyProfile({ role: 'conductor' })).toBe(true);
    expect(isFacultyProfile({ role: 'teacher' })).toBe(true);
    expect(isFacultyProfile({ role: 'Director' })).toBe(true);
  });
  it('false for students, null, undefined', () => {
    expect(isFacultyProfile({ role: 'student' })).toBe(false);
    expect(isFacultyProfile(null)).toBe(false);
    expect(isFacultyProfile(undefined)).toBe(false);
    expect(isFacultyProfile({})).toBe(false);
  });
});
