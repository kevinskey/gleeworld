import { describe, it, expect } from 'vitest';
import { getOnboardingCompletion, type OnboardingProfile } from './useOnboardingProfile';

const base: OnboardingProfile = {} as OnboardingProfile;
const measurements = { height_feet: 5, height_inches: 6, chest: 36, waist: 30, hips: 38, shoe_size: 9 };

describe('getOnboardingCompletion', () => {
  it('a fresh profile requires only name + email (nothing is complete yet)', () => {
    const c = getOnboardingCompletion(base);
    expect(c).toEqual({ required: false, profile: false, headshot: false, uniform: false, agreements: false });
  });

  it('name + email alone makes onboarding submittable (required = true)', () => {
    const c = getOnboardingCompletion({ ...base, first_name: 'Amara', last_name: 'Cole', email: 'a@b.co' });
    expect(c.required).toBe(true);
    expect(c.profile).toBe(true);
    // Optional sections stay false without blocking submission.
    expect(c.uniform).toBe(false);
    expect(c.agreements).toBe(false);
    expect(c.headshot).toBe(false);
  });

  it('reports optional sections independently when provided', () => {
    const c = getOnboardingCompletion({
      ...base, first_name: 'Amara', last_name: 'Cole', email: 'a@b.co',
      headshot_url: 'https://x/y.jpg', measurements,
      photo_consent: true, media_release_signed_at: '2026-07-10T00:00:00Z',
    });
    expect(c).toEqual({ required: true, profile: true, headshot: true, uniform: true, agreements: true });
  });

  it('needs the full measurement set for uniform (a partial set is not complete)', () => {
    const c = getOnboardingCompletion({
      ...base, first_name: 'A', last_name: 'B', email: 'a@b.co',
      measurements: { height_feet: 5, chest: 36 },
    });
    expect(c.uniform).toBe(false);
    expect(c.required).toBe(true); // still submittable — uniform is optional
  });
});
